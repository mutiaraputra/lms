'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function DashboardPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        // Kelas hanya dapat diambil ADMIN/GURU; siswa lewati agar tidak 403.
        const canReadClasses = user?.role === 'ADMIN' || user?.role === 'GURU';
        const [mats, exms, cls] = await Promise.all([
          apiGet('/materials').catch(() => []),
          apiGet('/exams').catch(() => []),
          canReadClasses ? apiGet('/master/classes').catch(() => []) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setMaterials(Array.isArray(mats) ? mats : []);
        setExams(Array.isArray(exms) ? exms : []);
        setClasses(Array.isArray(cls) ? cls : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Banner */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 p-8 text-white shadow-lg">
        <h2 className="text-2xl font-bold">Selamat Datang, {user?.name}!</h2>
        <p className="mt-2 max-w-2xl text-sm text-indigo-100">
          {user?.role === 'ADMIN' &&
            'Anda memiliki akses penuh untuk mengelola master data sekolah, akun guru, dan akun siswa.'}
          {user?.role === 'GURU' &&
            'Kelola materi pembelajaran, jadwal ujian objektif, evaluasi tugas, dan rekap penilaian peserta didik.'}
          {user?.role === 'SISWA' &&
            `Kelas: ${user?.studentProfile?.class?.name || '-'} | Jurusan: ${
              user?.studentProfile?.major?.name || '-'
            } | NIS: ${user?.studentProfile?.nis || '-'}`}
        </p>
      </div>

      {/* Stats Row */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Materi Aktif" value={materials.length} />
        <StatCard label="Ujian Tersedia" value={exams.length} accent="text-indigo-600" />
        {(user?.role === 'ADMIN' || user?.role === 'GURU') && (
          <StatCard label="Total Rombel Kelas" value={classes.length} />
        )}
        <StatCard label="Status Akun" value="Aktif" accent="text-emerald-600" />
      </div>

      {/* 2-Column Sections */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Materi Pembelajaran Terbaru</h3>
          {materials.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada materi pembelajaran yang dipublikasikan.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {materials.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{m.title}</p>
                    <p className="text-xs text-slate-500">
                      {m.teachingAssignment?.subject?.name || 'Mata Pelajaran'} • Guru:{' '}
                      {m.teachingAssignment?.teacher?.user?.name || '-'}
                    </p>
                  </div>
                  {m.fileUrl && (
                    <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                      {m.fileType || 'file'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Daftar Ujian</h3>
          {exams.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada jadwal ujian.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {exams.slice(0, 6).map((ex) => (
                <div key={ex.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{ex.title}</p>
                    <p className="text-xs text-slate-500">
                      {ex.subject?.name || 'Mapel'} • Durasi: {ex.durationMinutes} menit
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {ex._count?.questions || ex.totalQuestions || 0} Soal
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent || 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
