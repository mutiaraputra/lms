// Halaman 404 kustom (Fase 2).

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-2 text-5xl font-bold text-indigo-600">404</div>
        <h1 className="text-lg font-bold text-slate-900">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-slate-500">
          Alamat yang Anda tuju tidak tersedia atau telah dipindahkan.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
