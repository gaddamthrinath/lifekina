'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode as QrIcon } from 'lucide-react';

interface QrCodeViewProps {
  value: string;
  size?: number;
  label?: string;
}

export default function QrCodeView({ value, size = 260, label }: QrCodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    setError(null);

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'L', // Low error correction keeps matrix density low and scannable
      },
      (err) => {
        if (err) {
          console.error('QR Render Error:', err);
          setError('Failed to render QR Code. Use the text code below.');
        }
      }
    );
  }, [value, size]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', textAlign: 'center' }}>
          {label}
        </div>
      )}

      <div
        style={{
          background: '#ffffff',
          padding: 14,
          borderRadius: 12,
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '100%',
        }}
      >
        {error ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              maxWidth: '100%',
              height: 'auto',
              borderRadius: 6,
            }}
          />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            padding: '6px 14px',
            borderRadius: 'var(--r-full)',
            background: copied ? 'var(--brand-light)' : 'var(--bg-subtle)',
            color: copied ? 'var(--brand-dark)' : 'var(--text-sub)',
            border: `1px solid ${copied ? 'var(--brand-mid)' : 'var(--border-light)'}`,
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? (
            <>
              <Check size={14} style={{ color: 'var(--brand-dark)' }} />
              <span>Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy Sync Code</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
