'use client';

import { useRef, useState } from 'react';
import { Download, Upload, Trash2, Lock, AlertTriangle, CheckCircle, Fingerprint } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import { CURRENCIES } from '@/lib/currencies';
import { Settings } from '@/lib/types';
import { registerWebAuthnCredential } from '@/lib/webauthn';

const DATE_FORMATS: { value: Settings['dateFormat']; label: string }[] = [
  { value: 'MMM DD, YYYY', label: 'Sep 12, 2026 (Month Day, Year)' },
  { value: 'DD/MM/YYYY',   label: '12/09/2026 (Day/Month/Year)' },
  { value: 'MM/DD/YYYY',   label: '09/12/2026 (Month/Day/Year)' },
];

export default function SettingsPage() {
  const { settings, updateSetting, exportData, importData, clearData } = useApp();
  const [showClear, setShowClear] = useState(false);
  const [clearing, setClearing]   = useState(false);
  const [importErr, setImportErr]  = useState('');
  const [importOk,  setImportOk]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const currency   = settings.currency   ?? 'INR';
  const dateFormat = settings.dateFormat ?? 'MMM DD, YYYY';

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErr(''); setImportOk(false);
    try {
      await importData(file);
      setImportOk(true);
      setTimeout(() => setImportOk(false), 3000);
    } catch {
      setImportErr('Invalid backup format. Please select a valid Lifekina backup JSON file.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Settings</h1>
          <div className="pg-sub">Manage your preferences, data backups, and privacy controls.</div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="s-section">
        <div className="s-section-title">Preferences</div>

        <div className="s-row">
          <div className="s-row-left">
            <div className="s-label">Currency</div>
            <div className="s-sub">Symbol used across all expense calculations</div>
          </div>
          <div className="s-row-right">
            <select
              id="currency-select"
              className="fs"
              style={{ width: 220 }}
              value={currency}
              onChange={async e => {
                const found = CURRENCIES.find(c => c.code === e.target.value);
                if (!found) return;
                await updateSetting('currency', e.target.value);
                await updateSetting('currencySymbol', found.symbol);
              }}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="s-row">
          <div className="s-row-left">
            <div className="s-label">Date Format</div>
            <div className="s-sub">Controls date display formatting in transaction lists</div>
          </div>
          <div className="s-row-right">
            <select
              id="date-format-select"
              className="fs"
              style={{ width: 260 }}
              value={dateFormat}
              onChange={e => updateSetting('dateFormat', e.target.value as Settings['dateFormat'])}
            >
              {DATE_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="s-section">
        <div className="s-section-title">Data Backups &amp; Management</div>

        <div className="s-row">
          <div className="s-row-left">
            <div className="s-label">Export Data Backup</div>
            <div className="s-sub">Download your expense records and categories as a JSON backup file</div>
          </div>
          <div className="s-row-right">
            <button className="btn btn-outline btn-sm" onClick={exportData} id="export-btn">
              <Download size={14} /> Export Backup
            </button>
          </div>
        </div>

        <div className="s-row">
          <div className="s-row-left">
            <div className="s-label">Import Data Backup</div>
            <div className="s-sub">Restore your records from a previous Lifekina JSON backup file</div>
          </div>
          <div className="s-row-right">
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} id="import-file" />
            <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} id="import-btn">
              <Upload size={14} /> Import Backup
            </button>
          </div>
        </div>

        {importErr && (
          <div style={{ margin: '12px 0 0', padding: '10px 14px', background: 'var(--exp-bg)', border: '1px solid var(--exp-border)', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--exp-dark)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertTriangle size={15} /> {importErr}
          </div>
        )}
        {importOk && (
          <div style={{ margin: '12px 0 0', padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#047857', display: 'flex', gap: 8, alignItems: 'center' }}>
            <CheckCircle size={15} /> Data backup restored successfully.
          </div>
        )}

        <div className="s-row" style={{ marginTop: 8 }}>
          <div className="s-row-left">
            <div className="s-label" style={{ color: 'var(--exp-dark)' }}>Reset All Data</div>
            <div className="s-sub">Permanently delete all expenses, custom categories, and app preferences</div>
          </div>
          <div className="s-row-right">
            <button className="btn btn-danger btn-sm" onClick={() => setShowClear(true)} id="clear-btn">
              <Trash2 size={14} /> Reset Data
            </button>
          </div>
        </div>
      </div>

      {/* Privacy & Security Section */}
      <div className="s-section">
        <div className="s-section-title">Privacy &amp; Security</div>

        {/* WebAuthn Controls */}
        <div className="s-row">
          <div className="s-row-left" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Fingerprint size={20} color="var(--brand-dark)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div className="s-label">Device Biometric Lock</div>
              <div className="s-sub" style={{ maxWidth: 480, marginTop: 2, lineHeight: 1.5 }}>
                Require Windows Hello, Touch ID, Face ID, or device credentials whenever opening Lifekina. Hardware-bound strictly to this computer.
              </div>
            </div>
          </div>
          <div className="s-row-right" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {settings.webAuthnEnabled && (
              <button
                className="btn btn-outline btn-sm"
                onClick={async () => {
                  try {
                    const { credentialId } = await registerWebAuthnCredential('Lifekina User');
                    await updateSetting('webAuthnCredentialId', credentialId);
                    await updateSetting('webAuthnEnabled', true);
                    alert('Device biometrics re-enrolled successfully!');
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Re-enrollment failed.';
                    alert(msg);
                  }
                }}
              >
                Re-enroll Biometrics
              </button>
            )}
            <button
              className={`btn btn-sm ${settings.webAuthnEnabled ? 'btn-danger' : 'btn-primary'}`}
              onClick={async () => {
                if (settings.webAuthnEnabled) {
                  await updateSetting('webAuthnEnabled', false);
                } else {
                  try {
                    const { credentialId } = await registerWebAuthnCredential('Lifekina User');
                    await updateSetting('webAuthnCredentialId', credentialId);
                    await updateSetting('webAuthnEnabled', true);
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Enrollment failed.';
                    alert(msg);
                  }
                }
              }}
            >
              {settings.webAuthnEnabled ? 'Disable Biometrics' : 'Enable Biometrics'}
            </button>
          </div>
        </div>

        {/* Local Storage Disclaimer */}
        <div className="s-row" style={{ marginTop: 8 }}>
          <div className="s-row-left" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Lock size={18} color="var(--brand-dark)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div className="s-label">100% Local &amp; Private</div>
              <div className="s-sub" style={{ maxWidth: 520, marginTop: 4, lineHeight: 1.5 }}>
                Your finances are stored exclusively inside your browser&apos;s IndexedDB database. Lifekina requires no server communication, tracking code, or accounts.
              </div>
            </div>
          </div>
        </div>
      </div>

      {showClear && (
        <ConfirmDialog
          title="Reset all data"
          description="This will permanently wipe all stored expenses, categories, and settings from this browser. This cannot be undone."
          confirmLabel="Reset Everything"
          onConfirm={async () => { setClearing(true); await clearData(); setClearing(false); setShowClear(false); }}
          onCancel={() => setShowClear(false)}
          isLoading={clearing}
        />
      )}
    </div>
  );
}
