'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  DollarSign,
  Droplets,
  FileText,
  LayoutDashboard,
  Map,
  Settings,
  Truck,
  Users,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/orders', label: 'Orders', icon: Truck },
  { href: '/routes', label: 'Routes', icon: Map },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/pricing', label: 'Pricing', icon: DollarSign },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

// The five most-used destinations get the mobile bottom bar.
const MOBILE_NAV = NAV.slice(0, 5);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="no-print hidden w-56 shrink-0 flex-col bg-navy-950 text-slate-300 md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <Droplets className="text-aqua-400" size={24} />
          <div>
            <div className="text-sm font-bold leading-tight text-white">Garden State</div>
            <div className="text-xs font-medium tracking-widest text-aqua-400">WATER</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(pathname, href)
                  ? 'bg-aqua-500/15 text-aqua-300'
                  : 'hover:bg-navy-800 hover:text-white'
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-xs text-slate-500">v1.0</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between bg-navy-950 px-4 py-3 text-white md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Droplets className="text-aqua-400" size={20} />
          <span className="text-sm font-bold">Garden State Water</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-navy-800 bg-navy-950 pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium ${
              isActive(pathname, href) ? 'text-aqua-300' : 'text-slate-400'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
