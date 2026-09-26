'use client';

import { ShieldCheck, Sparkles } from 'lucide-react';

export default function TopHeader() {
  return (
    <header className="top-header">

      <div className="workspace-status">
        <span>private space for your daily life</span>
      </div>

      <div className="h-actions">
        <ShieldCheck size={14} color="var(--brand-dark)" />
        100% Private &amp; Local
      </div>
    </header>
  );
}

