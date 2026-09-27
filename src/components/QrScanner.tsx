'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, AlertCircle, RefreshCw, Clipboard, Check, Eye } from 'lucide-react';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  title?: string;
}

export default function QrScanner({ onScan, title = 'Scan QR Code' }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'lifekina-qr-reader';

  const [mode, setMode] = useState<'camera' | 'paste'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [pastedCode, setPastedCode] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Initialize camera list
  useEffect(() => {
    let isMounted = true;

    async function initCameras() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available on mobile
          const backCamera = devices.find(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('rear')
          );
          setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
        } else {
          setCameraError('No cameras detected on this device.');
          setMode('paste');
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Unable to access camera';
        setCameraError(`Camera access denied or unavailable: ${msg}`);
        setMode('paste');
      }
    }

    if (mode === 'camera') {
      initCameras();
    }

    return () => {
      isMounted = false;
    };
  }, [mode]);

  // Start scanner when camera is selected
  useEffect(() => {
    if (mode !== 'camera' || !selectedCameraId) return;

    let isMounted = true;
    let qrScanner: Html5Qrcode | null = null;

    async function startScanner() {
      try {
        setIsStarting(true);
        setCameraError(null);

        // Make sure container exists in DOM
        await new Promise(r => setTimeout(r, 100));

        qrScanner = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = qrScanner;

        await qrScanner.start(
          selectedCameraId,
          {
            fps: 15,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isMounted) {
              qrScanner?.stop().catch(() => {});
              onScan(decodedText);
            }
          },
          () => {
            // Frame scanned with no QR detected, ignore frame error
          }
        );
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Could not start camera stream';
          setCameraError(`Failed to start camera: ${msg}`);
        }
      } finally {
        if (isMounted) setIsStarting(false);
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      if (qrScanner && qrScanner.isScanning) {
        qrScanner.stop().catch(() => {}).finally(() => {
          try {
            qrScanner?.clear();
          } catch {}
        });
      }
    };
  }, [selectedCameraId, mode, onScan]);

  const handlePasteSubmit = () => {
    setPasteError(null);
    const code = pastedCode.trim();
    if (!code) {
      setPasteError('Please paste a sync code first.');
      return;
    }
    try {
      onScan(code);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code';
      setPasteError(msg);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPastedCode(text);
      if (text.trim()) {
        onScan(text.trim());
      }
    } catch {
      setPasteError('Could not read clipboard. Please paste manually into the box.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 360, margin: '0 auto' }}>
      {/* Mode Switcher */}
      <div
        style={{
          display: 'flex',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--r-md)',
          padding: 3,
          marginBottom: 16,
          width: '100%',
        }}
      >
        <button
          type="button"
          onClick={() => setMode('camera')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 'var(--r-sm)',
            background: mode === 'camera' ? 'var(--bg-surface)' : 'transparent',
            color: mode === 'camera' ? 'var(--text-main)' : 'var(--text-muted)',
            boxShadow: mode === 'camera' ? 'var(--shadow-xs)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Camera size={15} />
          <span>Camera Scan</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('paste')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 'var(--r-sm)',
            background: mode === 'paste' ? 'var(--bg-surface)' : 'transparent',
            color: mode === 'paste' ? 'var(--text-main)' : 'var(--text-muted)',
            boxShadow: mode === 'paste' ? 'var(--shadow-xs)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Clipboard size={15} />
          <span>Paste Code</span>
        </button>
      </div>

      {mode === 'camera' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {cameraError ? (
            <div
              style={{
                width: '100%',
                padding: 16,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--r-md)',
                color: '#991b1b',
                fontSize: 13,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Camera Not Available</div>
                <div>{cameraError}</div>
                <button
                  type="button"
                  onClick={() => setMode('paste')}
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#b91c1c',
                    textDecoration: 'underline',
                  }}
                >
                  Switch to Manual Paste &rarr;
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Camera Scanner Viewport */}
              <div
                style={{
                  width: 280,
                  height: 280,
                  background: '#0f172a',
                  borderRadius: 16,
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-md)',
                  border: '2px solid var(--border-light)',
                }}
              >
                <div id={containerId} style={{ width: '100%', height: '100%' }} />
                {isStarting && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(15, 23, 42, 0.8)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: 13,
                      gap: 8,
                    }}
                  >
                    <RefreshCw size={24} className="spin" />
                    <span>Opening Camera...</span>
                  </div>
                )}
              </div>

              {cameras.length > 1 && (
                <div style={{ marginTop: 10, width: '100%' }}>
                  <select
                    className="fs"
                    style={{ width: '100%', fontSize: 12 }}
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                  >
                    {cameras.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Camera ${c.id.slice(0, 5)}...`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
                Position the QR code inside the frame to scan automatically.
              </div>
            </>
          )}
        </div>
      )}

      {mode === 'paste' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>
            Paste the sync code generated by the other device:
          </div>

          <textarea
            className="fi"
            style={{
              width: '100%',
              height: 110,
              fontSize: 12,
              fontFamily: 'monospace',
              resize: 'none',
              padding: 10,
            }}
            placeholder="PL1:..."
            value={pastedCode}
            onChange={(e) => setPastedCode(e.target.value)}
          />

          {pasteError && (
            <div style={{ fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={14} />
              <span>{pasteError}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 14px',
                borderRadius: 'var(--r-md)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-sub)',
                border: '1px solid var(--border-light)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Clipboard size={14} />
              <span>Paste Clipboard</span>
            </button>

            <button
              type="button"
              onClick={handlePasteSubmit}
              disabled={!pastedCode.trim()}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 14px',
                borderRadius: 'var(--r-md)',
                background: pastedCode.trim() ? 'var(--brand)' : 'var(--border-strong)',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                cursor: pastedCode.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <Check size={14} />
              <span>Connect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
