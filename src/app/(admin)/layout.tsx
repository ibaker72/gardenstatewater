import { AdminShell } from '@/components/AdminShell';

// Every admin page reads live business data — never prerender at build time.
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
