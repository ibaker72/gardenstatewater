import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Customer Portal · Garden State Water',
  description: 'Check your deliveries, pay your bill, and request water — all in one place.',
  // Customers who "Add to Home Screen" install the portal, not the admin app.
  manifest: '/portal.webmanifest',
  appleWebApp: { capable: true, title: 'GSW Water', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#eefafd',
};

// The customer portal is always light mode — fresh and clean — even when the
// device (or an admin who shares the browser) prefers dark.
const forceLight = `document.documentElement.classList.remove('dark');`;

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ colorScheme: 'light' }}>
      <script dangerouslySetInnerHTML={{ __html: forceLight }} />
      {children}
    </div>
  );
}
