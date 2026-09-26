import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import ClientRoot from '@/components/ClientRoot';

export const metadata: Metadata = {
  title: 'Lifekina — Life in motion',
  description: 'A private, local-first workspace for your daily tasks, notes, and expenses. No login, no servers.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Lifekina',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: '#fff' }} suppressHydrationWarning>
      <body style={{ background: '#fff' }} suppressHydrationWarning>
        <AppProvider>
          <ClientRoot>{children}</ClientRoot>
        </AppProvider>
      </body>
    </html>
  );
}
