import LZString from 'lz-string';
import { SyncPayload, SyncSummary, ExportedSyncStats, SyncResult } from './types';
import { getLocalSyncPayload, mergeRemoteSyncPayload } from './syncMerge';
import { recordSyncHistory } from './syncHistory';
import {
  generateRoomId,
  generateSyncSecretKey,
  importSyncSecretKey,
  encryptPayload,
  decryptPayload,
} from './crypto';
import { startMqttHostSignaling, startMqttJoinerSignaling } from './mqttSignaling';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

const PROTOCOL_1SCAN_PREFIX = 'PL2:';
const CHUNK_SIZE = 16 * 1024; // 16 KB safe chunk size for RTCDataChannel

export interface SyncProgressInfo {
  stage:
    | 'idle'
    | 'generating_offer'
    | 'connecting_relay'
    | 'waiting_scan'
    | 'connecting_p2p'
    | 'transferring'
    | 'merging'
    | 'completed'
    | 'error';
  message: string;
  result?: SyncResult;
}

/**
 * Waits for WebRTC ICE candidates gathering to finish so SDP has all IP routes
 */
function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 2500): Promise<void> {
  return new Promise(resolve => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };
    const checkState = () => {
      if (pc.iceGatheringState === 'complete') {
        finish();
      }
    };
    pc.addEventListener('icegatheringstatechange', checkState);
    setTimeout(finish, timeoutMs);
  });
}

/**
 * Helper to transmit large payloads across RTCDataChannel in chunks
 */
function sendChunkedMessage(channel: RTCDataChannel, messageType: string, payload: unknown) {
  const jsonStr = JSON.stringify({ type: messageType, payload });
  const totalChunks = Math.ceil(jsonStr.length / CHUNK_SIZE);
  const transferId = Math.random().toString(36).substring(2, 9);

  for (let i = 0; i < totalChunks; i++) {
    const chunk = jsonStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const packet = JSON.stringify({
      transferId,
      chunkIndex: i,
      totalChunks,
      data: chunk,
    });
    channel.send(packet);
  }
}

/**
 * Helper to receive and reassemble chunked packets
 */
class ChunkReceiver {
  private buffers = new Map<string, { total: number; chunks: Map<number, string> }>();

  public processPacket(rawText: string): { type: string; payload: unknown } | null {
    try {
      const packet = JSON.parse(rawText);
      if (packet.transferId && packet.totalChunks !== undefined) {
        if (!this.buffers.has(packet.transferId)) {
          this.buffers.set(packet.transferId, {
            total: packet.totalChunks,
            chunks: new Map(),
          });
        }
        const buf = this.buffers.get(packet.transferId)!;
        buf.chunks.set(packet.chunkIndex, packet.data);

        if (buf.chunks.size === buf.total) {
          let fullStr = '';
          for (let i = 0; i < buf.total; i++) {
            fullStr += buf.chunks.get(i) || '';
          }
          this.buffers.delete(packet.transferId);
          return JSON.parse(fullStr);
        }
        return null;
      }
    } catch {
      // ignore
    }
    return null;
  }
}

export interface P2PSyncSession {
  peerConnection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  close: () => void;
}

/**
 * Step 1 (Host / Initiator): Generates single-use session, publishes offer, displays 1 QR code
 */
export async function create1ScanHostSession(
  onProgress: (info: SyncProgressInfo) => void
): Promise<{
  qrPayload: string;
  session: P2PSyncSession;
  syncPromise: Promise<SyncResult>;
}> {
  onProgress({ stage: 'generating_offer', message: 'Preparing secure sync session...' });

  const roomId = generateRoomId();
  const { key: aesKey, keyString } = await generateSyncSecretKey();

  const pc = new RTCPeerConnection(RTC_CONFIG);
  const channel = pc.createDataChannel('lifekina-p2p-sync', { ordered: true });
  const receiver = new ChunkReceiver();
  let mqttHandle: { close: () => void } | null = null;
  let localExportStats: ExportedSyncStats = {
    transactionsCount: 0,
    categoriesCount: 0,
    todosCount: 0,
    notesCount: 0,
    remindersCount: 0,
    totalCount: 0,
  };

  const session: P2PSyncSession = {
    peerConnection: pc,
    dataChannel: channel,
    close: () => {
      try { mqttHandle?.close(); } catch {}
      try { channel.close(); } catch {}
      try { pc.close(); } catch {}
    },
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGathering(pc);

  if (!pc.localDescription) {
    throw new Error('Failed to create local sync offer.');
  }

  // Encrypt the Offer SDP
  const encryptedOffer = await encryptPayload(JSON.stringify(pc.localDescription), aesKey);

  onProgress({ stage: 'connecting_relay', message: 'Ready to scan...' });

  // 1 Single QR Payload: PL2:<roomId>:<keyString>
  const qrPayload = `${PROTOCOL_1SCAN_PREFIX}${roomId}:${keyString}`;

  const syncPromise = new Promise<SyncResult>(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      session.close();
      reject(new Error('Sync session timed out. Please scan the QR code within 60 seconds.'));
    }, 60000);

    try {
      mqttHandle = await startMqttHostSignaling(roomId, encryptedOffer, async (encryptedAnswer) => {
        try {
          onProgress({ stage: 'connecting_p2p', message: 'Connected to other device! Exchanging records...' });

          const decryptedAnswerStr = await decryptPayload(encryptedAnswer, aesKey);
          const answerDesc = JSON.parse(decryptedAnswerStr);
          await pc.setRemoteDescription(new RTCSessionDescription(answerDesc));

          mqttHandle?.close();
          mqttHandle = null;
        } catch (err) {
          clearTimeout(timeout);
          session.close();
          reject(err);
        }
      });

      channel.onopen = async () => {
        try {
          onProgress({ stage: 'transferring', message: 'Exchanging and updating records...' });
          const { payload: localData, stats } = await getLocalSyncPayload();
          localExportStats = stats;
          sendChunkedMessage(channel, 'SYNC_DATA_EXCHANGE', localData);
        } catch (err) {
          clearTimeout(timeout);
          session.close();
          reject(err);
        }
      };

      channel.onmessage = async (event) => {
        const message = receiver.processPacket(event.data);
        if (!message) return;

        if (message.type === 'SYNC_DATA_EXCHANGE') {
          onProgress({ stage: 'merging', message: 'Merging records into your device...' });
          try {
            const remoteData = message.payload as SyncPayload;
            const importedSummary = await mergeRemoteSyncPayload(remoteData);

            const result: SyncResult = {
              imported: importedSummary,
              exported: localExportStats,
            };

            // Record to persistent sync history
            await recordSyncHistory('host', importedSummary, localExportStats);

            sendChunkedMessage(channel, 'SYNC_COMPLETED', { result });
            clearTimeout(timeout);
            onProgress({ stage: 'completed', message: 'Sync complete!', result });
            resolve(result);
          } catch (mergeErr) {
            clearTimeout(timeout);
            session.close();
            reject(mergeErr);
          }
        }
      };

      channel.onerror = () => {
        clearTimeout(timeout);
        session.close();
        reject(new Error('Connection error during sync.'));
      };
    } catch (err) {
      clearTimeout(timeout);
      session.close();
      reject(err);
    }
  });

  return {
    qrPayload,
    session,
    syncPromise,
  };
}

/**
 * Step 2 (Joiner): Scans 1 QR code and connects directly
 */
export async function start1ScanJoinerSession(
  scannedCode: string,
  onProgress: (info: SyncProgressInfo) => void
): Promise<{
  session: P2PSyncSession;
  syncPromise: Promise<SyncResult>;
}> {
  onProgress({ stage: 'connecting_relay', message: 'Connecting to other device...' });

  const clean = scannedCode.trim();
  if (!clean.startsWith(PROTOCOL_1SCAN_PREFIX)) {
    throw new Error('Invalid QR code. Please scan a valid Lifekina Sync QR code.');
  }

  const parts = clean.slice(PROTOCOL_1SCAN_PREFIX.length).split(':');
  if (parts.length < 2) {
    throw new Error('Invalid sync format in QR code.');
  }

  const [roomId, keyString] = parts;
  const aesKey = await importSyncSecretKey(keyString);

  const pc = new RTCPeerConnection(RTC_CONFIG);
  const receiver = new ChunkReceiver();
  let channelRef: RTCDataChannel | null = null;
  let mqttHandle: { close: () => void } | null = null;
  let localExportStats: ExportedSyncStats = {
    transactionsCount: 0,
    categoriesCount: 0,
    todosCount: 0,
    notesCount: 0,
    remindersCount: 0,
    totalCount: 0,
  };

  const session: P2PSyncSession = {
    peerConnection: pc,
    close: () => {
      try { mqttHandle?.close(); } catch {}
      try { channelRef?.close(); } catch {}
      try { pc.close(); } catch {}
    },
  };

  const syncPromise = new Promise<SyncResult>(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      session.close();
      reject(new Error('Sync session timed out. Please try again.'));
    }, 45000);

    try {
      mqttHandle = await startMqttJoinerSignaling(roomId, async (encryptedOffer) => {
        onProgress({ stage: 'connecting_p2p', message: 'Connecting and preparing data transfer...' });

        const decryptedOfferStr = await decryptPayload(encryptedOffer, aesKey);
        const offerDesc = JSON.parse(decryptedOfferStr);
        await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGathering(pc);

        if (!pc.localDescription) {
          throw new Error('Failed to create local sync reply.');
        }

        const encryptedAnswer = await encryptPayload(JSON.stringify(pc.localDescription), aesKey);

        setTimeout(() => {
          mqttHandle?.close();
          mqttHandle = null;
        }, 3000);

        return encryptedAnswer;
      });

      pc.ondatachannel = (ev) => {
        const channel = ev.channel;
        channelRef = channel;
        session.dataChannel = channel;

        channel.onopen = async () => {
          onProgress({ stage: 'transferring', message: 'Exchanging data between devices...' });
        };

        channel.onmessage = async (event) => {
          const message = receiver.processPacket(event.data);
          if (!message) return;

          if (message.type === 'SYNC_DATA_EXCHANGE') {
            onProgress({ stage: 'merging', message: 'Merging records into your device...' });
            try {
              // Send local data back to host
              const { payload: localData, stats } = await getLocalSyncPayload();
              localExportStats = stats;
              sendChunkedMessage(channel, 'SYNC_DATA_EXCHANGE', localData);

              // Merge host's data into our DB
              const remoteData = message.payload as SyncPayload;
              const importedSummary = await mergeRemoteSyncPayload(remoteData);

              const result: SyncResult = {
                imported: importedSummary,
                exported: localExportStats,
              };

              // Record to persistent sync history
              await recordSyncHistory('joiner', importedSummary, localExportStats);

              clearTimeout(timeout);
              onProgress({ stage: 'completed', message: 'Sync complete!', result });
              resolve(result);
            } catch (mergeErr) {
              clearTimeout(timeout);
              session.close();
              reject(mergeErr);
            }
          }
        };

        channel.onerror = () => {
          clearTimeout(timeout);
          session.close();
          reject(new Error('Connection error on receiving device.'));
        };
      };
    } catch (err) {
      clearTimeout(timeout);
      session.close();
      reject(err);
    }
  });

  return {
    session,
    syncPromise,
  };
}
