'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Smartphone,
  Laptop,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Layers,
  ArrowLeftRight,
  ShieldCheck,
} from 'lucide-react';
import QrCodeView from './QrCodeView';
import QrScanner from './QrScanner';
import {
  createHostOffer,
  createJoinerAnswer,
  P2PSyncSession,
  SyncProgressInfo,
} from '@/lib/p2pSync';
import { SyncSummary } from '@/lib/types';
import { useApp } from '@/context/AppContext';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalFlow =
  | 'CHOOSE'
  | 'HOST_GENERATING'
  | 'HOST_SHOW_OFFER'
  | 'HOST_SCAN_ANSWER'
  | 'JOINER_SCAN_OFFER'
  | 'JOINER_SHOW_ANSWER'
  | 'SYNCING'
  | 'SUCCESS'
  | 'ERROR';

export default function SyncModal({ isOpen, onClose }: SyncModalProps) {
  const { reloadAll } = useApp();

  const [flow, setFlow] = useState<ModalFlow>('CHOOSE');
  const [offerCode, setOfferCode] = useState<string>('');
  const [answerCode, setAnswerCode] = useState<string>('');
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  const sessionRef = useRef<P2PSyncSession | null>(null);
  const hostCompleteFnRef = useRef<((answer: string, onProgress: (i: SyncProgressInfo) => void) => Promise<SyncSummary>) | null>(null);

  // Reset state when opening/closing
  useEffect(() => {
    if (!isOpen) {
      sessionRef.current?.close();
      sessionRef.current = null;
      setFlow('CHOOSE');
      setOfferCode('');
      setAnswerCode('');
      setProgressMsg('');
      setErrorMessage('');
      setSyncSummary(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    sessionRef.current?.close();
    sessionRef.current = null;
    onClose();
  };

  // ─── HOST FLOW ─────────────────────────────────────────────────────────────
  const startHostFlow = async () => {
    try {
      setFlow('HOST_GENERATING');
      setProgressMsg('Generating secure P2P sync session...');
      const { offerCode: code, session, completeWithAnswer } = await createHostOffer();
      sessionRef.current = session;
      hostCompleteFnRef.current = completeWithAnswer;
      setOfferCode(code);
      setFlow('HOST_SHOW_OFFER');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize sync session.';
      setErrorMessage(msg);
      setFlow('ERROR');
    }
  };

  const handleHostScannedAnswer = async (scannedAnswer: string) => {
    if (!hostCompleteFnRef.current) return;
    try {
      setFlow('SYNCING');
      setProgressMsg('Connecting devices...');
      const summary = await hostCompleteFnRef.current(scannedAnswer, (info) => {
        setProgressMsg(info.message);
      });
      setSyncSummary(summary);
      await reloadAll();
      setFlow('SUCCESS');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync handshake failed.';
      setErrorMessage(msg);
      setFlow('ERROR');
    }
  };

  // ─── JOINER FLOW ───────────────────────────────────────────────────────────
  const startJoinerFlow = () => {
    setFlow('JOINER_SCAN_OFFER');
  };

  const handleJoinerScannedOffer = async (scannedOffer: string) => {
    try {
      setFlow('SYNCING');
      setProgressMsg('Processing offer from Device A...');
      const { answerCode: code, session, syncPromise } = await createJoinerAnswer(
        scannedOffer,
        (info) => {
          setProgressMsg(info.message);
        }
      );
      sessionRef.current = session;
      setAnswerCode(code);
      setFlow('JOINER_SHOW_ANSWER');

      // Await completion in background while showing answer QR
      syncPromise
        .then(async (summary) => {
          setSyncSummary(summary);
          await reloadAll();
          setFlow('SUCCESS');
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Sync failed.';
          setErrorMessage(msg);
          setFlow('ERROR');
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to read sync offer.';
      setErrorMessage(msg);
      setFlow('ERROR');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 480,
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px',
            borderBottom: '1px solid var(--border-light)',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--r-md)',
                background: 'var(--brand-light)',
                color: 'var(--brand-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeftRight size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                Device-to-Device Sync
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                100% Serverless • End-to-End Encrypted
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: 6,
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-muted)',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* 1. CHOOSE ROLE */}
          {flow === 'CHOOSE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-sub)',
                  lineHeight: 1.5,
                  background: 'var(--bg-subtle)',
                  padding: '12px 14px',
                  borderRadius: 'var(--r-md)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <ShieldCheck size={18} style={{ color: 'var(--brand-dark)', flexShrink: 0, marginTop: 2 }} />
                <span>
                  Sync expenses, notes, and tasks between any two devices directly over local WebRTC. No data is ever stored on any server.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={startHostFlow}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    borderRadius: 12,
                    border: '1.5px solid var(--border-light)',
                    background: 'var(--bg-surface)',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--brand)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: 'var(--brand-light)',
                        color: 'var(--brand-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <QrCode size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                        Show QR Code (Device A)
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Generate a QR code on this device to start sync.
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={18} style={{ color: 'var(--text-light)' }} />
                </button>

                <button
                  type="button"
                  onClick={startJoinerFlow}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    borderRadius: 12,
                    border: '1.5px solid var(--border-light)',
                    background: 'var(--bg-surface)',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--brand)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Smartphone size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                        Scan QR Code (Device B)
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Use camera to scan QR from Device A and connect.
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={18} style={{ color: 'var(--text-light)' }} />
                </button>
              </div>
            </div>
          )}

          {/* 2. HOST GENERATING OFFER */}
          {flow === 'HOST_GENERATING' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <RefreshCw size={36} className="spin" style={{ color: 'var(--brand)', margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                {progressMsg}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Preparing P2P encryption keys and local network routes...
              </div>
            </div>
          )}

          {/* 3. HOST SHOW OFFER QR */}
          {flow === 'HOST_SHOW_OFFER' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--brand-light)',
                  color: 'var(--brand-dark)',
                  padding: '4px 12px',
                  borderRadius: 'var(--r-full)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Step 1 of 2
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
                Scan this QR code with Device B
              </div>

              <QrCodeView value={offerCode} />

              <button
                type="button"
                onClick={() => setFlow('HOST_SCAN_ANSWER')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 18px',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--brand)',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 6,
                }}
              >
                <span>Scanned on Device B? Now Scan Return QR</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* 4. HOST SCAN ANSWER QR */}
          {flow === 'HOST_SCAN_ANSWER' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--brand-light)',
                  color: 'var(--brand-dark)',
                  padding: '4px 12px',
                  borderRadius: 'var(--r-full)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Step 2 of 2
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
                Scan the Return QR code shown on Device B
              </div>

              <QrScanner onScan={handleHostScannedAnswer} title="Scan Return QR from Device B" />

              <button
                type="button"
                onClick={() => setFlow('HOST_SHOW_OFFER')}
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  textDecoration: 'underline',
                  marginTop: 6,
                }}
              >
                &larr; Back to Device A QR code
              </button>
            </div>
          )}

          {/* 5. JOINER SCAN OFFER QR */}
          {flow === 'JOINER_SCAN_OFFER' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--brand-light)',
                  color: 'var(--brand-dark)',
                  padding: '4px 12px',
                  borderRadius: 'var(--r-full)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Step 1 of 2
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
                Scan QR code displayed on Device A
              </div>

              <QrScanner onScan={handleJoinerScannedOffer} title="Scan Device A QR Code" />

              <button
                type="button"
                onClick={() => setFlow('CHOOSE')}
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  textDecoration: 'underline',
                  marginTop: 6,
                }}
              >
                &larr; Choose a different mode
              </button>
            </div>
          )}

          {/* 6. JOINER SHOW ANSWER QR */}
          {flow === 'JOINER_SHOW_ANSWER' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--brand-light)',
                  color: 'var(--brand-dark)',
                  padding: '4px 12px',
                  borderRadius: 'var(--r-full)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Step 2 of 2
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
                Show this Return QR to Device A to complete sync
              </div>

              <QrCodeView value={answerCode} />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--text-sub)',
                  background: 'var(--bg-subtle)',
                  padding: '10px 14px',
                  borderRadius: 'var(--r-md)',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                <RefreshCw size={15} className="spin" style={{ color: 'var(--brand)' }} />
                <span>Waiting for Device A to scan...</span>
              </div>
            </div>
          )}

          {/* 7. SYNCING / TRANSFERRING */}
          {flow === 'SYNCING' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <RefreshCw size={40} className="spin" style={{ color: 'var(--brand)', margin: '0 auto 16px' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
                Syncing in Progress
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 6 }}>
                {progressMsg || 'Exchanging records and merging data stores...'}
              </div>
            </div>
          )}

          {/* 8. SUCCESS */}
          {flow === 'SUCCESS' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--r-full)',
                  background: 'var(--brand-light)',
                  color: 'var(--brand-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>
                Devices Synchronized!
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 20 }}>
                All local records and changes have been merged bidirectionally.
              </div>

              {syncSummary && (
                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    borderRadius: 12,
                    padding: 14,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 10,
                    textAlign: 'left',
                    fontSize: 12,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: 8 }}>
                    <div style={{ color: 'var(--text-muted)' }}>Transactions:</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                      +{syncSummary.transactionsAdded} added, {syncSummary.transactionsUpdated} updated
                    </div>
                  </div>

                  <div style={{ padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: 8 }}>
                    <div style={{ color: 'var(--text-muted)' }}>Categories:</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                      +{syncSummary.categoriesAdded} added
                    </div>
                  </div>

                  <div style={{ padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: 8 }}>
                    <div style={{ color: 'var(--text-muted)' }}>Todos:</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                      +{syncSummary.todosAdded} added, {syncSummary.todosUpdated} updated
                    </div>
                  </div>

                  <div style={{ padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: 8 }}>
                    <div style={{ color: 'var(--text-muted)' }}>Notes:</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                      +{syncSummary.notesAdded} added, {syncSummary.notesUpdated} updated
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--brand)',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Done
              </button>
            </div>
          )}

          {/* 9. ERROR */}
          {flow === 'ERROR' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--r-full)',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <AlertCircle size={30} />
              </div>

              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                Sync Could Not Complete
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-sub)',
                  marginTop: 8,
                  marginBottom: 20,
                  background: 'var(--bg-subtle)',
                  padding: '10px 14px',
                  borderRadius: 'var(--r-md)',
                }}
              >
                {errorMessage || 'Connection timed out or signal code was invalid.'}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setFlow('CHOOSE')}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 'var(--r-md)',
                    background: 'var(--brand)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 'var(--r-md)',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
