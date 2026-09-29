'use client';

import { ShieldCheck, Download, Check } from 'lucide-react';
import { usePWAInstall } from './PWAInstallPrompt';

export default function TopHeader() {
  const { canInstall, isStandalone, triggerInstall } = usePWAInstall();

  return (
    <header className="top-header">
      <div className="sanctuary-status">
        <span>private space for your daily life</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {!isStandalone && (
          <button
            type="button"
            className="pwa-header-install-btn"
            onClick={() => triggerInstall()}
            title="Install Lifekina as a standalone Desktop or Mobile App"
          >
            <Download size={13} />
            <span>Install App</span>
          </button>
        )}

        {isStandalone && (
          <div className="pwa-header-installed-badge" title="Running as installed standalone desktop app">
            <Check size={12} color="var(--brand-dark)" />
            <span>Desktop App</span>
          </div>
        )}

        <div className="h-actions">
          <ShieldCheck size={14} color="var(--brand-dark)" />
          100% Private &amp; Local
        </div>
      </div>
    </header>
  );
}


