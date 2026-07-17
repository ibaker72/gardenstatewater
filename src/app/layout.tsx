import type { Metadata, Viewport } from 'next';
import { PRODUCTION_APP_URL } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_APP_URL),
  title: { default: 'Garden State Water', template: '%s · Garden State Water' },
  description: 'Water delivery business platform — CRM, routes, invoicing, and more.',
  manifest: '/manifest.webmanifest',
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f2744' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1a2f' },
  ],
};

const themeScript = `
try {
  const t = localStorage.getItem('gsw-theme');
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch {}
if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(() => {
      // The very first visit isn't service-worker-controlled yet, so the
      // worker never sees (or caches) it. Cache it from here so even a
      // customer's first page works offline. Keep the name in sync w/ sw.js.
      caches.open('gsw-v2').then((c) => c.add(location.pathname + location.search)).catch(() => {});
    }).catch(() => {});
  });
}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
