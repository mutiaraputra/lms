'use client';

// =============================================================================
// Kerangka aplikasi (Fase 2): sidebar navigasi berbasis peran + header dengan
// info user & logout. Responsif (sidebar dapat dibuka/tutup di layar kecil).
// =============================================================================

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { navItemsForRole, ROLE_LABELS } from '@/lib/nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null; // RequireAuth menangani redirect

  const items = navItemsForRole(user.role);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">
            SN
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">LMS SMK Nagara</p>
            <p className="text-[11px] text-slate-400">Portal Pembelajaran</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {items.map((item) =>
            item.ready ? (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ) : (
              <span
                key={item.href}
                title="Segera hadir"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400"
              >
                <span className="text-base opacity-60">{item.icon}</span>
                {item.label}
                <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                  segera
                </span>
              </span>
            ),
          )}
        </nav>
      </aside>

      {/* Konten */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:px-6">
          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            ☰
          </button>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{user.name}</p>
              <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Keluar
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
