import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import ClientRoot from '@/components/ClientRoot';

export const metadata: Metadata = {
  title: 'Lifekina — Life in motion',
  description: 'A private, local-first sanctuary for your daily tasks, notes, and expenses. No login, no servers.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icons/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'Lifekina',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
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
