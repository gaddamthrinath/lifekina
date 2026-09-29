'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import AppShell from './AppShell';
import { Sparkles } from 'lucide-react';
import { checkAndDispatchReminders } from '@/lib/notification';

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const { isLoading, isOnboarded } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Register Service Worker for PWA support & Background Notifications
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }

    // Global background interval to check reminders everywhere in the app
    const interval = setInterval(() => {
      checkAndDispatchReminders();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (pathname === '/') return;
    if (!isOnboarded && pathname !== '/onboarding') router.replace('/onboarding');
    else if (isOnboarded && pathname === '/onboarding') router.replace('/dashboard');
  }, [isLoading, isOnboarded, pathname, router]);

  if (isLoading) {
    return (
      <div className="loading-screen" role="status" aria-label="Loading sanctuary">
        <div className="loading-logo-box">
          <Sparkles size={24} color="#fff" strokeWidth={2.5} />
        </div>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 18, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
          Lifekina
        </div>
        <div className="spinner" />
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>
          Opening your private sanctuary...
        </span>
      </div>
    );
  }

  if (pathname === '/' || !isOnboarded) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}


