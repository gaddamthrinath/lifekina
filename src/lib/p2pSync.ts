import LZString from 'lz-string';
import { SyncPayload, SyncSummary } from './types';
import { getLocalSyncPayload, mergeRemoteSyncPayload } from './syncMerge';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

const SIGNAL_PREFIX = 'PL1:';
const CHUNK_SIZE = 16 * 1024; // 16 KB safe chunk size for RTCDataChannel

export interface SyncProgressInfo {
  stage: 'idle' | 'generating_offer' | 'waiting_answer' | 'connecting' | 'transferring' | 'merging' | 'completed' | 'error';
  message: string;
  bytesTransferred?: number;
  totalBytes?: number;
  summary?: SyncSummary;
}

/**
 * Encodes SDP into an ultra-compact URL-safe Base64 string for QR codes
 */
export function encodeSignalData(obj: RTCSessionDescriptionInit): string {
  const raw = JSON.stringify({ t: obj.type, s: obj.sdp });
  const compressed = LZString.compressToEncodedURIComponent(raw);
  return `${SIGNAL_PREFIX}${compressed}`;
}

/**
 * Decodes compressed signal data from QR code or text
 */
export function decodeSignalData(code: string): RTCSessionDescriptionInit {
  const clean = code.trim();
  const payload = clean.startsWith(SIGNAL_PREFIX) ? clean.slice(SIGNAL_PREFIX.length) : clean;
  const decompressed = LZString.decompressFromEncodedURIComponent(payload);
  if (!decompressed) {
    // Try raw JSON parse if uncompressed fallback
    try {
      const parsed = JSON.parse(clean);
      if (parsed.type && parsed.sdp) return parsed;
    } catch {
      // ignore
    }
    throw new Error('Invalid QR or Sync Code format.');
  }

  const parsed = JSON.parse(decompressed);
  return {
    type: parsed.t,
    sdp: parsed.s,
  };
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
 * Step 1 (Host): Creates the WebRTC PeerConnection, DataChannel, Offer, and returns the QR code string.
 */
export async function createHostOffer(): Promise<{
  offerCode: string;
  session: P2PSyncSession;
  completeWithAnswer: (answerCode: string, onProgress: (info: SyncProgressInfo) => void) => Promise<SyncSummary>;
}> {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  const channel = pc.createDataChannel('lifekina-p2p-sync', { ordered: true });
  const receiver = new ChunkReceiver();

  const session: P2PSyncSession = {
    peerConnection: pc,
    dataChannel: channel,
    close: () => {
      try { channel.close(); } catch {}
      try { pc.close(); } catch {}
    },
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGathering(pc);

  if (!pc.localDescription) {
    throw new Error('Failed to generate local SDP Offer.');
  }

  const offerCode = encodeSignalData(pc.localDescription);

  const completeWithAnswer = (
    answerCode: string,
    onProgress: (info: SyncProgressInfo) => void
  ): Promise<SyncSummary> => {
    return new Promise(async (resolve, reject) => {
      try {
        onProgress({ stage: 'connecting', message: 'Connecting to peer device...' });
        const answerDesc = decodeSignalData(answerCode);
        await pc.setRemoteDescription(new RTCSessionDescription(answerDesc));

        const timeout = setTimeout(() => {
          reject(new Error('Connection timed out. Please ensure both devices are in range or on the same network.'));
        }, 30000);

        channel.onopen = async () => {
          try {
            onProgress({ stage: 'transferring', message: 'Connected! Sending local data to peer...' });
            const localData = await getLocalSyncPayload();
            sendChunkedMessage(channel, 'SYNC_DATA_EXCHANGE', localData);
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
          }
        };

        channel.onmessage = async (event) => {
          const message = receiver.processPacket(event.data);
          if (!message) return;

          if (message.type === 'SYNC_DATA_EXCHANGE') {
            onProgress({ stage: 'merging', message: 'Merging received data from peer...' });
            try {
              const remoteData = message.payload as SyncPayload;
              const summary = await mergeRemoteSyncPayload(remoteData);
              
              // Tell peer we are finished
              sendChunkedMessage(channel, 'SYNC_COMPLETED', { summary });
              
              clearTimeout(timeout);
              onProgress({ stage: 'completed', message: 'Synchronization successful!', summary });
              resolve(summary);
            } catch (mergeErr) {
              clearTimeout(timeout);
              reject(mergeErr);
            }
          }
        };

        channel.onerror = (e) => {
          clearTimeout(timeout);
          reject(new Error('DataChannel encountered an error during sync.'));
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  return {
    offerCode,
    session,
    completeWithAnswer,
  };
}

/**
 * Step 2 (Joiner): Scans the Host Offer, sets remote description, generates Answer and QR code string,
 * and handles the bi-directional data transfer.
 */
export async function createJoinerAnswer(
  offerCode: string,
  onProgress: (info: SyncProgressInfo) => void
): Promise<{
  answerCode: string;
  session: P2PSyncSession;
  syncPromise: Promise<SyncSummary>;
}> {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  const receiver = new ChunkReceiver();
  let channelRef: RTCDataChannel | null = null;

  const session: P2PSyncSession = {
    peerConnection: pc,
    close: () => {
      try { channelRef?.close(); } catch {}
      try { pc.close(); } catch {}
    },
  };

  onProgress({ stage: 'generating_offer', message: 'Processing host offer and preparing answer...' });
  const offerDesc = decodeSignalData(offerCode);
  await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIceGathering(pc);

  if (!pc.localDescription) {
    throw new Error('Failed to generate local SDP Answer.');
  }

  const answerCode = encodeSignalData(pc.localDescription);

  const syncPromise = new Promise<SyncSummary>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Peer connection timed out. Please verify Device A scanned the return QR.'));
    }, 30000);

    pc.ondatachannel = (ev) => {
      const channel = ev.channel;
      channelRef = channel;
      session.dataChannel = channel;

      channel.onopen = async () => {
        onProgress({ stage: 'transferring', message: 'Connected! Preparing sync exchange...' });
      };

      channel.onmessage = async (event) => {
        const message = receiver.processPacket(event.data);
        if (!message) return;

        if (message.type === 'SYNC_DATA_EXCHANGE') {
          onProgress({ stage: 'merging', message: 'Received data. Merging and sending local records...' });
          try {
            // First send our local data to host
            const localData = await getLocalSyncPayload();
            sendChunkedMessage(channel, 'SYNC_DATA_EXCHANGE', localData);

            // Now merge host's data into our DB
            const remoteData = message.payload as SyncPayload;
            const summary = await mergeRemoteSyncPayload(remoteData);

            onProgress({ stage: 'completed', message: 'Synchronization successful!', summary });
            clearTimeout(timeout);
            resolve(summary);
          } catch (mergeErr) {
            clearTimeout(timeout);
            reject(mergeErr);
          }
        }
      };

      channel.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('DataChannel error on joiner.'));
      };
    };
  });

  return {
    answerCode,
    session,
    syncPromise,
  };
}
