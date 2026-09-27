'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Smartphone,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowLeftRight,
  ShieldCheck,
  Download,
  Upload,
} from 'lucide-react';
import QrCodeView from './QrCodeView';
import QrScanner from './QrScanner';
import {
  create1ScanHostSession,
  start1ScanJoinerSession,
  P2PSyncSession,
} from '@/lib/p2pSync';
import { SyncResult } from '@/lib/types';
import { useApp } from '@/context/AppContext';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncCompleted?: () => void;
}

type ModalFlow =
  | 'CHOOSE'
  | 'HOST_GENERATING'
  | 'HOST_SHOW_QR'
  | 'JOINER_SCAN'
  | 'SYNCING'
  | 'SUCCESS'
  | 'ERROR';

export default function SyncModal({ isOpen, onClose, onSyncCompleted }: SyncModalProps) {
  const { reloadAll } = useApp();

  const [flow, setFlow] = useState<ModalFlow>('CHOOSE');
  const [qrCodePayload, setQrCodePayload] = useState<string>('');
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const sessionRef = useRef<P2PSyncSession | null>(null);

  // Reset state when opening/closing
  useEffect(() => {
    if (!isOpen) {
      sessionRef.current?.close();
      sessionRef.current = null;
      setFlow('CHOOSE');
      setQrCodePayload('');
      setProgressMsg('');
      setErrorMessage('');
      setSyncResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    sessionRef.current?.close();
    sessionRef.current = null;
    onClose();
  };

  // ─── 1-SCAN HOST FLOW (DEVICE A) ───────────────────────────────────────────
  const startHostFlow = async () => {
    try {
      setFlow('HOST_GENERATING');
      setProgressMsg('Preparing sync session...');

      const { qrPayload, session, syncPromise } = await create1ScanHostSession((info) => {
        setProgressMsg(info.message);
      });

      sessionRef.current = session;
      setQrCodePayload(qrPayload);
      setFlow('HOST_SHOW_QR');

      // Await peer scan and sync in the background
      syncPromise
        .then(async (result) => {
          setSyncResult(result);
          await reloadAll();
          onSyncCompleted?.();
          setFlow('SUCCESS');
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Sync could not be completed.';
          setErrorMessage(msg);
          setFlow('ERROR');
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize sync.';
      setErrorMessage(msg);
      setFlow('ERROR');
    }
  };

  // ─── 1-SCAN JOINER FLOW (DEVICE B) ─────────────────────────────────────────
  const startJoinerFlow = () => {
    setFlow('JOINER_SCAN');
  };

  const handleJoinerScannedQr = async (scannedCode: string) => {
    try {
      setFlow('SYNCING');
      setProgressMsg('Connecting to other device...');

      const { session, syncPromise } = await start1ScanJoinerSession(scannedCode, (info) => {
        setProgressMsg(info.message);
      });

      sessionRef.current = session;

      syncPromise
        .then(async (result) => {
          setSyncResult(result);
          await reloadAll();
          onSyncCompleted?.();
          setFlow('SUCCESS');
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Sync failed.';
          setErrorMessage(msg);
          setFlow('ERROR');
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to read QR code.';
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
          maxWidth: 500,
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
                Sync Between Devices
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Direct &amp; Private Sync
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
                  Synchronize your expenses, notes, and tasks directly between any two devices. Both devices will receive and combine each other&apos;s records.
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
                        Show QR Code (This Device)
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Display a QR code on this screen for your other device to scan.
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
                        Scan QR Code (Other Device)
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Use this device&apos;s camera to scan the code from your other device.
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={18} style={{ color: 'var(--text-light)' }} />
                </button>
              </div>
            </div>
          )}

          {/* 2. HOST GENERATING */}
          {flow === 'HOST_GENERATING' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <RefreshCw size={36} className="spin" style={{ color: 'var(--brand)', margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                {progressMsg}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Setting up connection...
              </div>
            </div>
          )}

          {/* 3. HOST SHOW QR (1 SCAN ONLY) */}
          {flow === 'HOST_SHOW_QR' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
                Point your other device&apos;s camera at this QR code
              </div>

              <QrCodeView value={qrCodePayload} />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--brand-dark)',
                  background: 'var(--brand-light)',
                  padding: '10px 16px',
                  borderRadius: 'var(--r-md)',
                  width: '100%',
                  justifyContent: 'center',
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={15} className="spin" />
                <span>Waiting for other device to scan...</span>
              </div>
            </div>
          )}

          {/* 4. JOINER SCAN QR */}
          {flow === 'JOINER_SCAN' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
                Scan the QR code shown on your other device
              </div>

              <QrScanner onScan={handleJoinerScannedQr} title="Scan QR Code" />

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

          {/* 5. SYNCING / CONNECTING */}
          {flow === 'SYNCING' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <RefreshCw size={40} className="spin" style={{ color: 'var(--brand)', margin: '0 auto 16px' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
                Syncing in Progress
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 6 }}>
                {progressMsg || 'Transferring and updating data...'}
              </div>
            </div>
          )}

          {/* 6. SUCCESS */}
          {flow === 'SUCCESS' && (
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--r-full)',
                  background: 'var(--brand-light)',
                  color: 'var(--brand-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <CheckCircle2 size={30} />
              </div>

              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>
                Devices Synchronized!
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 16 }}>
                Both devices now have all updated records.
              </div>

              {syncResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  {/* Imported Section */}
                  <div
                    style={{
                      background: 'var(--brand-light)',
                      border: '1px solid var(--brand-mid)',
                      borderRadius: 12,
                      padding: 12,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--brand-dark)', marginBottom: 8 }}>
                      <Download size={15} />
                      <span>Imported into this device:</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
                      <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Expenses: </span>
                        <strong>+{syncResult.imported.transactionsAdded} added</strong>
                        {syncResult.imported.transactionsUpdated > 0 && <span style={{ color: 'var(--text-muted)' }}>, {syncResult.imported.transactionsUpdated} updated</span>}
                      </div>

                      <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Notes: </span>
                        <strong>+{syncResult.imported.notesAdded} added</strong>
                        {syncResult.imported.notesUpdated > 0 && <span style={{ color: 'var(--text-muted)' }}>, {syncResult.imported.notesUpdated} updated</span>}
                      </div>

                      <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tasks: </span>
                        <strong>+{syncResult.imported.todosAdded} added</strong>
                        {syncResult.imported.todosUpdated > 0 && <span style={{ color: 'var(--text-muted)' }}>, {syncResult.imported.todosUpdated} updated</span>}
                      </div>

                      <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Categories: </span>
                        <strong>+{syncResult.imported.categoriesAdded} added</strong>
                      </div>
                    </div>
                  </div>

                  {/* Exported Section */}
                  <div
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 12,
                      padding: 12,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
                      <Upload size={15} />
                      <span>Sent to other device:</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
                      <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Expenses: </span>
                        <strong>{syncResult.exported.transactionsCount} records</strong>
                      </div>

                      <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Notes: </span>
                        <strong>{syncResult.exported.notesCount} records</strong>
                      </div>

                      <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tasks: </span>
                        <strong>{syncResult.exported.todosCount} records</strong>
                      </div>

                      <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Categories: </span>
                        <strong>{syncResult.exported.categoriesCount} records</strong>
                      </div>
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

          {/* 7. ERROR */}
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
                {errorMessage || 'Connection timed out or network error occurred.'}
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
