'use client';

// Batas galat tingkat aplikasi (Fase 2). Menangkap galat render tak tertangani
// dan menawarkan pemulihan (coba lagi) tanpa layar kosong.

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Di produksi ini bisa dikirim ke pemantauan (mis. Sentry) — Fase 9.
    console.error('Kesalahan aplikasi:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-3 text-4xl">⚠️</div>
        <h1 className="text-lg font-bold text-slate-900">Terjadi kesalahan</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sistem mengalami gangguan saat memuat halaman ini. Silakan coba lagi.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Coba lagi
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Ke Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
