'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, Search, ChevronRight, ShieldCheck, Fingerprint, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { CURRENCIES } from '@/lib/currencies';
import { Settings } from '@/lib/types';
import { isWebAuthnSupported, registerWindowsHelloCredential } from '@/lib/webauthn';

const DATE_FORMATS: { value: Settings['dateFormat']; label: string; example: string }[] = [
  { value: 'MMM DD, YYYY', label: 'Month Day, Year', example: 'Sep 12, 2026' },
  { value: 'DD/MM/YYYY', label: 'Day/Month/Year', example: '12/09/2026' },
  { value: 'MM/DD/YYYY', label: 'Month/Day/Year', example: '09/12/2026' },
];

export default function OnboardingPage() {
  const { completeOnboarding } = useApp();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState<Settings['dateFormat']>('MMM DD, YYYY');
  const [webAuthnSupported, setWebAuthnSupported] = useState(true);
  const [webAuthnCredentialId, setWebAuthnCredentialId] = useState<string | undefined>(undefined);
  const [authError, setAuthError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    isWebAuthnSupported().then((supported) => {
      setWebAuthnSupported(supported);
    });
  }, []);

  const handleRegisterWindowsHello = async () => {
    setAuthError('');
    setRegistering(true);
    try {
      const { credentialId } = await registerWindowsHelloCredential('Lifekina User');
      setWebAuthnCredentialId(credentialId);
      setStep(4);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Device biometric enrollment failed.';
      setAuthError(msg);
    } finally {
      setRegistering(false);
    }
  };

  const filtered = CURRENCIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const finish = async () => {
    if (!currency) return;
    setSaving(true);
    await completeOnboarding(
      currency,
      dateFormat,
      !!webAuthnCredentialId,
      webAuthnCredentialId
    );
    router.replace('/dashboard');
  };

  return (
    <div className="ob-wrap">
      <div className="ob-card">
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
            <ShieldCheck size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', letterSpacing: -0.4, fontFamily: 'var(--font-heading)' }}>Lifekina</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Life in motion — 100% Offline sanctuary</div>
          </div>
        </div>

        {/* Step Progress Dots */}
        <div className="ob-dots">
          {[1, 2, 3, 4].map(s => <div key={s} className={`ob-dot${step === s ? ' on' : ''}`} />)}
        </div>

        {/* Step 1: Currency Selection */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, letterSpacing: -0.4, fontFamily: 'var(--font-heading)' }}>Choose your currency</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
              Select the currency symbol for your expense records.
            </div>

            <div className="search-box" style={{ marginBottom: 10 }}>
              <Search size={14} className="search-ico" />
              <input
                id="ob-search"
                className="fi search-input"
                type="text"
                placeholder="Search currency code or name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="curr-list">
              {filtered.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--text-light)' }}>No matching currencies found</div>
              )}
              {filtered.map(c => (
                <div key={c.code} className={`curr-item${currency === c.code ? ' on' : ''}`} onClick={() => setCurrency(c.code)}>
                  <span className="curr-code">{c.code}</span>
                  <span className="curr-sym">{c.symbol}</span>
                  <span className="curr-name">{c.name}</span>
                </div>
              ))}
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setStep(2)} id="ob-next-1">
              Continue <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Step 2: Date Format Selection */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, letterSpacing: -0.4, fontFamily: 'var(--font-heading)' }}>Date Format</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
              Choose how dates are displayed across your ledger.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {DATE_FORMATS.map(f => (
                <div
                  key={f.value}
                  className={`df-opt${dateFormat === f.value ? ' on' : ''}`}
                  onClick={() => setDateFormat(f.value)}
                >
                  <div className="df-radio">
                    {dateFormat === f.value && <div className="df-dot" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)' }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.example}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={() => setStep(3)} id="ob-next-2">
                Continue <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Mandatory Device Authentication (Windows Hello / Touch ID / Face ID) */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, letterSpacing: -0.4, fontFamily: 'var(--font-heading)' }}>Device Biometric Security</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
              Device-specific authentication is <strong>mandatory</strong> to protect your records on this machine.
            </div>

            <div style={{ padding: '16px 20px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-light)', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--r-full)', background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Fingerprint size={24} color="var(--brand-dark)" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                Platform Biometric Hardware Lock
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Locks your private space using this device&apos;s native hardware (Windows Hello, Touch ID, Face ID, or system PIN). Strictly bound to this hardware with zero cloud syncing.
              </div>
            </div>

            {authError && (
              <div style={{ margin: '0 0 16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-sm)', fontSize: 12.5, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} /> <span>{authError}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px 18px', fontSize: 14, fontWeight: 700 }}
                onClick={handleRegisterWindowsHello}
                disabled={registering}
                id="ob-enroll-biometrics"
              >
                <Fingerprint size={18} /> {registering ? 'Waiting for Device Biometrics…' : 'Enroll Device Biometrics (Mandatory)'}
              </button>

              {!webAuthnSupported && (
                <div style={{ fontSize: 12, color: '#d97706', padding: '8px 12px', background: '#fffbeb', borderRadius: 'var(--r-sm)', border: '1px solid #fef3c7', marginTop: 4 }}>
                  Note: If accessing via local network IP instead of http://localhost:3000, your browser may require localhost or HTTPS for biometric APIs.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setStep(2)}>Back</button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation Summary */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, letterSpacing: -0.4, fontFamily: 'var(--font-heading)' }}>Setup complete!</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              Lifekina is ready. All data is kept 100% private in local storage.
            </div>

            <div style={{ padding: '16px 20px', background: 'var(--brand-light)', borderRadius: 'var(--r-sm)', border: '1px solid var(--brand-mid)', marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-dark)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Configuration Summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Currency', value: CURRENCIES.find(c => c.code === currency)?.name ?? currency },
                  { label: 'Date Format', value: DATE_FORMATS.find(f => f.value === dateFormat)?.example ?? dateFormat },
                  {
                    label: 'Device Security',
                    value: 'Mandatory (Windows Hello / Platform Protected)',
                  },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(3)}>Back</button>
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={finish} disabled={saving} id="ob-start">
                <Check size={16} /> {saving ? 'Opening sanctuary…' : 'Open Dashboard'}
              </button>
            </div>
          </div>
        )}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link href="/" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>
            What is Lifekina? Learn more &amp; Privacy Overview →
          </Link>
        </div>
      </div>
    </div>
  );
}

