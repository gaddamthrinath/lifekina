'use client';

import { useState, useCallback } from 'react';
import { ShieldCheck, Fingerprint, Lock, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { authenticateWindowsHello } from '@/lib/webauthn';

interface LockScreenProps {
  webAuthnEnabled?: boolean;
  webAuthnCredentialId?: string;
  onUnlock: () => void;
  onResetData?: () => Promise<void>;
}

export default function LockScreen({
  webAuthnCredentialId,
  onUnlock,
  onResetData,
}: LockScreenProps) {
  const [error, setError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  const triggerDeviceAuth = useCallback(async () => {
    if (authenticating) return;
    setError('');
    setAuthenticating(true);
    try {
      const success = await authenticateWindowsHello(webAuthnCredentialId);
      if (success) {
        onUnlock();
      } else {
        setError('Device authentication failed. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Device authentication cancelled.';
      setError(msg);
    } finally {
      setAuthenticating(false);
    }
  }, [authenticating, webAuthnCredentialId, onUnlock]);

  const handleEmergencyReset = async () => {
    if (!onResetData) return;
    setResetting(true);
    try {
      await onResetData();
      onUnlock();
    } catch {
      setError('Emergency reset failed. Please clear browser site storage.');
    } finally {
      setResetting(false);
      setShowRecoveryModal(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(248, 250, 252, 0.96)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid var(--border-light)',
          boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.15)',
          padding: '36px 32px',
          textAlign: 'center',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            width: 54,
            height: 54,
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
          }}
        >
          <Lock size={26} color="#ffffff" strokeWidth={2.2} />
        </div>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
          Lifekina Locked
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
          Verify your identity using your device&apos;s native hardware biometrics (Windows Hello / Touch ID / Face ID).
        </p>

        {error && (
          <div
            style={{
              margin: '0 0 20px',
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--r-sm)',
              fontSize: 12.5,
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textAlign: 'left',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px 20px',
              fontSize: 14.5,
              fontWeight: 700,
              justifyContent: 'center',
              gap: 10,
            }}
            onClick={triggerDeviceAuth}
            disabled={authenticating}
          >
            <Fingerprint size={20} />
            {authenticating ? 'Verifying with Device…' : 'Unlock with Device Biometrics'}
          </button>

          <button
            type="button"
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginTop: 4,
            }}
            onClick={() => setShowRecoveryModal(true)}
          >
            Device Hardware Recovery / Reset
          </button>
        </div>

        <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <ShieldCheck size={13} color="var(--brand-dark)" /> Protected by Device Platform Biometrics
        </div>
      </div>

      {/* Recovery Modal */}
      {showRecoveryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              background: '#ffffff',
              borderRadius: 14,
              padding: 24,
              textAlign: 'left',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} color="#d97706" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Device Hardware Recovery
              </h3>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6, marginBottom: 16 }}>
              Because Lifekina is <strong>100% local and private</strong>, your security keys are bound strictly to this device&apos;s biometric hardware.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 8, padding: 12, marginBottom: 18, fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
              If your device sensor is unresponsive, you can perform an <strong>Emergency Reset</strong> to clear the lock and re-import your saved JSON data backup.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {onResetData && (
                <button
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', justifyContent: 'center', color: '#dc2626', borderColor: '#fecaca', padding: '10px 14px' }}
                  onClick={handleEmergencyReset}
                  disabled={resetting}
                >
                  <RefreshCw size={14} className={resetting ? 'spin' : ''} /> {resetting ? 'Resetting…' : 'Emergency Reset & Re-import Backup'}
                </button>
              )}

              <button
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowRecoveryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
