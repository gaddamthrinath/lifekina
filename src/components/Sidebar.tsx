'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, CheckSquare, FileText, Calendar, Settings, Sparkles, ShieldCheck, Download } from 'lucide-react';
import { usePWAInstall } from './PWAInstallPrompt';

const NAV = [
  { href: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/entries',   label: 'Expenses',    icon: Receipt },
  { href: '/tasks',     label: 'Daily Tasks', icon: CheckSquare },
  { href: '/calendar',  label: 'Calendar',    icon: Calendar },
  { href: '/notes',     label: 'Notes',       icon: FileText },
  { href: '/settings',  label: 'Settings',    icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();
  const { isStandalone, triggerInstall } = usePWAInstall();

  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="sb-logo" style={{ textDecoration: 'none' }}>
        <div className="sb-logo-mark">
          <Sparkles size={18} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <div className="sb-logo-name">Lifekina</div>
          <div className="sb-logo-tag">Your private daily space</div>
        </div>
      </Link>

      <nav className="sb-nav">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`sb-link${active ? ' active' : ''}`}>
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}

        {!isStandalone && (
          <button
            type="button"
            className="sb-install-card"
            onClick={() => triggerInstall()}
          >
            <Download size={15} color="var(--brand-dark)" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)' }}>Install Desktop App</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>1-Click Standalone Window</div>
            </div>
          </button>
        )}
      </nav>

      <div className="sb-footer">
        <Link href="/" className="sb-badge" style={{ textDecoration: 'none', display: 'flex' }}>
          <ShieldCheck size={14} className="sb-badge-icon" strokeWidth={2.5} />
          <div>
            <div className="sb-badge-title">Private by design</div>
            <div className="sb-badge-sub">Product Overview &amp; Privacy →</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}

