'use client';

// =============================================================================
// Penjaga rute klien (Fase 2). Mengalihkan pengunjung tak terautentikasi ke
// halaman login. Opsional membatasi berdasarkan role.
// =============================================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/api';

export function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  /** Bila diisi, hanya role ini yang diizinkan. */
  roles?: Role[];
}) {
  const { user, initializing } = useAuth();
  const router = useRouter();

  const allowed = user && (!roles || roles.includes(user.role));

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      router.replace('/');
    }
  }, [initializing, user, router]);

  if (initializing || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-4xl">🔒</div>
          <h1 className="text-lg font-bold text-slate-900">Akses ditolak</h1>
          <p className="mt-2 text-sm text-slate-500">
            Halaman ini tidak tersedia untuk peran akun Anda.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
