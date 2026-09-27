'use client';

import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <TopHeader />
        <main className="page-body">{children}</main>
      </div>
      <BottomNav />
      <PWAInstallPrompt />
    </div>
  );
}

