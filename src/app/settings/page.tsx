'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Download, Upload, Trash2, Lock, AlertTriangle, CheckCircle, Fingerprint, ArrowLeftRight, QrCode, Clock, ChevronDown, ChevronUp, History, Laptop } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import SyncModal from '@/components/SyncModal';
import { usePWAInstall } from '@/components/PWAInstallPrompt';
import { CURRENCIES } from '@/lib/currencies';
import { Settings, SyncHistoryEntry } from '@/lib/types';
import { registerWebAuthnCredential } from '@/lib/webauthn';
import { getSyncHistory, clearSyncHistory } from '@/lib/syncHistory';

const DATE_FORMATS: { value: Settings['dateFormat']; label: string }[] = [
  { value: 'MMM DD, YYYY', label: 'Sep 12, 2026 (Month Day, Year)' },
  { value: 'DD/MM/YYYY',   label: '12/09/2026 (Day/Month/Year)' },
  { value: 'MM/DD/YYYY',   label: '09/12/2026 (Month/Day/Year)' },
];

export default function SettingsPage() {
  const { settings, updateSetting, exportData, importData, clearData } = useApp();
  const { isStandalone, triggerInstall } = usePWAInstall();
  const [showClear, setShowClear] = useState(false);
  const [showSync,  setShowSync]  = useState(false);
  const [clearing, setClearing]   = useState(false);
  const [importErr, setImportErr]  = useState('');
  const [importOk,  setImportOk]   = useState(false);
  const [historyList, setHistoryList] = useState<SyncHistoryEntry[]>([]);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    const list = await getSyncHistory();
    setHistoryList(list);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
              style={{ minWidth: 200 }}
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
              style={{ minWidth: 220 }}
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

      {/* App Installation & Desktop / Mobile Mode */}
      <div className="s-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--r-md)',
                background: isStandalone ? '#ecfdf5' : 'var(--brand-light)',
                color: isStandalone ? '#059669' : 'var(--brand-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Laptop size={18} />
            </div>
            <div>
              <div className="s-section-title" style={{ margin: 0 }}>
                Desktop &amp; Mobile App Installation
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {isStandalone
                  ? 'Currently running as a standalone installed application'
                  : 'Install Lifekina as a native Windows desktop app or mobile app'}
              </div>
            </div>
          </div>
          {!isStandalone && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => triggerInstall()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={14} /> Install App
            </button>
          )}
        </div>

        <div className="s-row">
          <div className="s-row-left">
            <div className="s-label">Application Status</div>
            <div className="s-sub">
              {isStandalone
                ? 'Lifekina is active in standalone window mode with direct local storage access.'
                : 'Install Lifekina to launch in its own window, pin to Windows Taskbar/Start Menu, and access 100% offline.'}
            </div>
          </div>
          <div className="s-row-right">
            {isStandalone ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 5, background: '#ecfdf5', padding: '4px 10px', borderRadius: 20, border: '1px solid #a7f3d0' }}>
                <CheckCircle size={13} /> Installed
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => triggerInstall()}
              >
                <Download size={13} /> Install to Device
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Device Sync Section */}
      <div className="s-section" style={{ border: '1.5px solid var(--brand-mid)', background: 'linear-gradient(180deg, var(--brand-light) 0%, var(--bg-surface) 70px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--r-md)',
                background: 'var(--brand)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeftRight size={18} />
            </div>
            <div>
              <div className="s-section-title" style={{ margin: 0, color: 'var(--text-main)' }}>
                Device Sync
              </div>
              <div style={{ fontSize: 12, color: 'var(--brand-dark)', fontWeight: 600 }}>
                Direct &amp; Private Sync Between Devices
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowSync(true)}
            id="open-sync-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <QrCode size={14} /> Sync Devices
          </button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.5, marginBottom: 16 }}>
          Keep your expenses, categories, tasks, notes, and reminders in sync across your phone, tablet, or secondary laptop. Transfers happen directly between your devices with zero cloud servers.
        </div>

        {/* Sync History (Last 5 Records) */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 14, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <History size={14} />
              <span>Recent Sync Activity (Last 5)</span>
            </div>
            {historyList.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Clear sync activity logs?')) {
                    await clearSyncHistory();
                    await loadHistory();
                  }
                }}
                style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'underline' }}
              >
                Clear History
              </button>
            )}
          </div>

          {historyList.length === 0 ? (
            <div style={{ padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px dashed var(--border-strong)', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              No syncs performed yet. Click <strong>Sync Devices</strong> to pair with your other device.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {historyList.map((entry) => {
                const isExpanded = expandedEntryId === entry.id;
                const totalAdded =
                  (entry.imported.transactionsAdded || 0) +
                  (entry.imported.todosAdded || 0) +
                  (entry.imported.notesAdded || 0) +
                  (entry.imported.categoriesAdded || 0) +
                  (entry.imported.remindersAdded || 0);

                const totalExported = entry.exported.totalCount || 0;

                return (
                  <div
                    key={entry.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 10,
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    {/* Entry Header */}
                    <div
                      onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none',
                        background: isExpanded ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                          <Clock size={14} style={{ color: 'var(--brand)' }} />
                          <span>{entry.formattedDate}</span>
                        </div>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 'var(--r-full)',
                            background: entry.role === 'host' ? 'var(--brand-light)' : '#eff6ff',
                            color: entry.role === 'host' ? 'var(--brand-dark)' : '#2563eb',
                          }}
                        >
                          {entry.role === 'host' ? 'Initiated on this device' : 'Joined via scan'}
                        </span>

                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          • +{totalAdded} imported, {totalExported} shared
                        </span>
                      </div>

                      <div style={{ color: 'var(--text-muted)', display: 'flex' }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {/* Entry Expanded Details */}
                    {isExpanded && (
                      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                          {/* Imported Column */}
                          <div style={{ background: 'var(--brand-light)', padding: 10, borderRadius: 8, border: '1px solid var(--brand-mid)' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-dark)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Download size={13} /> Imported into this device:
                            </div>
                            <ul style={{ fontSize: 12, listStyle: 'none', color: 'var(--text-sub)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <li>• Expenses: +{entry.imported.transactionsAdded} added, {entry.imported.transactionsUpdated} updated</li>
                              <li>• Notes: +{entry.imported.notesAdded} added, {entry.imported.notesUpdated} updated</li>
                              <li>• Tasks: +{entry.imported.todosAdded} added, {entry.imported.todosUpdated} updated</li>
                              <li>• Reminders: +{entry.imported.remindersAdded} added</li>
                              <li>• Categories: +{entry.imported.categoriesAdded} added</li>
                            </ul>
                          </div>

                          {/* Exported Column */}
                          <div style={{ background: 'var(--bg-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Upload size={13} /> Sent to other device:
                            </div>
                            <ul style={{ fontSize: 12, listStyle: 'none', color: 'var(--text-sub)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <li>• Expenses: {entry.exported.transactionsCount} records</li>
                              <li>• Notes: {entry.exported.notesCount} records</li>
                              <li>• Tasks: {entry.exported.todosCount} records</li>
                              <li>• Reminders: {entry.exported.remindersCount} records</li>
                              <li>• Categories: {entry.exported.categoriesCount} categories</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
              <div className="s-sub" style={{ marginTop: 2, lineHeight: 1.5 }}>
                Require Windows Hello, Touch ID, Face ID, or device credentials whenever opening Lifekina. Hardware-bound strictly to this computer.
              </div>
            </div>
          </div>
          <div className="s-row-right">
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
              <div className="s-sub" style={{ marginTop: 4, lineHeight: 1.5 }}>
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

      <SyncModal
        isOpen={showSync}
        onClose={() => setShowSync(false)}
        onSyncCompleted={loadHistory}
      />
    </div>
  );
}
