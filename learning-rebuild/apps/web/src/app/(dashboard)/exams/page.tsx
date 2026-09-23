'use client';

// =============================================================================
// Daftar ujian objektif (siswa melihat yang dibuka untuk kelas/jurusannya;
// guru/admin melihat semua ujian yang mereka buat).
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, ApiError } from '@/lib/api';
import { Badge, Button, Card, CardBody, EmptyState, PageHeader, PageLoader } from '@/components/ui/Card';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface Exam {
  id: number;
  title: string;
  examDate: string;
  durationMinutes: number;
  totalQuestions: number;
  isRandom: boolean;
  examType?: { name: string };
  subject?: { name: string };
  semester?: { name: string };
  teacher?: { user?: { name: string } };
  classes?: Array<{ class?: { name: string }; major?: { name: string } }>;
  _count?: { questions: number };
}

export default function ExamsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<Exam[]>('/exams');
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat ujian.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.title?.toLowerCase().includes(q) ||
        it.subject?.name?.toLowerCase().includes(q) ||
        it.examType?.name?.toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div>
      <PageHeader
        title="Ujian Objektif"
        description={
          user?.role === 'SISWA'
            ? 'Ujian yang dibuka untuk kelas & jurusan Anda. Klik untuk mulai mengerjakan.'
            : 'Daftar ujian pilihan ganda yang tersedia.'
        }
        actions={
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul / mapel…"
            className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        }
      />

      {loading ? (
        <PageLoader />
      ) : error ? (
        <Card>
          <CardBody>
            <p className="text-sm text-red-700">{error}</p>
          </CardBody>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📝"
          title={search ? 'Tidak ada ujian cocok' : 'Belum ada ujian'}
          description="Ujian yang dibuat guru akan tampil di sini setelah dibuka untuk kelas/jurusan."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ex) => (
            <ExamCard key={ex.id} exam={ex} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExamCard({ exam }: { exam: Exam }) {
  const targetCount = exam._count?.questions ?? exam.totalQuestions ?? 0;
  return (
    <Card className="flex h-full flex-col">
      <CardBody className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight text-slate-900">{exam.title}</h3>
          {exam.examType && <Badge tone="violet">{exam.examType.name}</Badge>}
        </div>
        <div className="mt-3 space-y-1 text-xs text-slate-500">
          {exam.subject?.name && (
            <p>
              📘 <span className="font-medium text-slate-700">{exam.subject.name}</span>
              {exam.semester?.name && ` • ${exam.semester.name}`}
            </p>
          )}
          {exam.teacher?.user?.name && <p>👤 {exam.teacher.user.name}</p>}
          <p>
            🗓 {formatDate(exam.examDate)} • ⏱ {exam.durationMinutes} menit
          </p>
          <p>📊 {targetCount} soal {exam.isRandom && '• Acak'}</p>
          {exam.classes && exam.classes.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {exam.classes.slice(0, 4).map((c, idx) => (
                <Badge key={idx} tone="sky">
                  {c.class?.name}-{c.major?.name}
                </Badge>
              ))}
              {exam.classes.length > 4 && (
                <Badge tone="slate">+{exam.classes.length - 4} kelas</Badge>
              )}
            </div>
          )}
        </div>
        <div className="mt-auto flex gap-2 pt-4">
          <Link href={`/dashboard/exams/${exam.id}`}>
            <Button size="sm">{userRole(exam) === 'GURU' ? 'Lihat Soal' : 'Mulai Ujian'}</Button>
          </Link>
          <Link href={`/dashboard/reports?examId=${exam.id}`}>
            <Button size="sm" variant="secondary">
              Rekap
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

function userRole(exam: Exam): 'GURU' | 'SISWA' {
  // Hint sederhana untuk label tombol — siswa melihat tombol "Mulai Ujian".
  return exam.teacher?.user?.name ? 'GURU' : 'SISWA';
}
