'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth, getUser } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cachedUser = getUser();
    if (!cachedUser) {
      router.push('/');
      return;
    }

    const loadData = async () => {
      try {
        const userProfile = await fetchWithAuth('/users/me');
        setProfile(userProfile);

        const [mats, exms, cls] = await Promise.all([
          fetchWithAuth('/materials'),
          fetchWithAuth('/exams'),
          fetchWithAuth('/master/classes'),
        ]);

        setMaterials(Array.isArray(mats) ? mats : []);
        setExams(Array.isArray(exms) ? exms : []);
        setClasses(Array.isArray(cls) ? cls : []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md">
              SN
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">LMS SMK Nagara</h1>
              <p className="text-xs text-slate-500">Portal Pembelajaran Modern</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{profile?.name}</p>
              <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                {profile?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 p-8 text-white shadow-lg">
          <h2 className="text-2xl font-bold">Selamat Datang, {profile?.name}!</h2>
          <p className="mt-2 text-indigo-100 text-sm max-w-2xl">
            {profile?.role === 'ADMIN' && 'Anda memiliki akses penuh untuk mengelola master data sekolah, akun guru, dan akun siswa.'}
            {profile?.role === 'GURU' && 'Kelola materi pembelajaran, jadwal ujian objektif, evaluasi tugas, dan rekap penilaian peserta didik.'}
            {profile?.role === 'SISWA' && `Kelas: ${profile?.studentProfile?.class?.name || '-'} | Jurusan: ${profile?.studentProfile?.major?.name || '-'} | NIS: ${profile?.studentProfile?.nis}`}
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Materi Aktif</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{materials.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ujian Tersedia</p>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{exams.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Rombel Kelas</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{classes.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Akun</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">Aktif</p>
          </div>
        </div>

        {/* 2-Column Sections */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Materials Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Materi Pembelajaran Terbaru</h3>
            {materials.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada materi pembelajaran yang dipublikasikan.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {materials.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{m.title}</p>
                      <p className="text-xs text-slate-500">
                        {m.teachingAssignment?.subject?.name || 'Mata Pelajaran'} • Guru: {m.teachingAssignment?.teacher?.user?.name || '-'}
                      </p>
                    </div>
                    {m.fileUrl && (
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 font-mono">
                        {m.fileType || 'file'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exams Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Daftar Ujian</h3>
            {exams.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada jadwal ujian.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {exams.slice(0, 6).map((ex) => (
                  <div key={ex.id} className="py-3 flex items-center justify-between">
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
          </div>
        </div>
      </main>
    </div>
  );
}
