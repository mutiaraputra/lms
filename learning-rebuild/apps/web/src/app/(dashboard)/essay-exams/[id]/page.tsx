'use client';

// =============================================================================
// Detail ujian essay (siswa membaca soal; guru/admin mengelola pembukaan
// kelas untuk ujian tersebut).
// =============================================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiDelete, apiGet, apiPost, ApiError } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Modal,
  PageHeader,
  PageLoader,
} from '@/components/ui/Card';
import { DataTable } from '@/components/ui/Table';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface EssayClass {
  id: number;
  classId: number;
  majorId: number;
  isActive: boolean;
  class?: { name: string };
  major?: { name: string };
}

interface EssayExamDetail {
  id: number;
  title: string;
  examDate: string;
  totalQuestions: number;
  essayContent: string;
  examType?: { name: string };
  subject?: { name: string };
  semester?: { name: string };
  teacher?: { user?: { name: string } };
  classes?: EssayClass[];
}

export default function EssayExamDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Number(rawId);
  const router = useRouter();
  const { user } = useAuth();
  const isAdminGuru = user?.role === 'ADMIN' || user?.role === 'GURU';

  const [data, setData] = useState<EssayExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Manage classes
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [allMajors, setAllMajors] = useState<any[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [addClassId, setAddClassId] = useState(0);
  const [addMajorId, setAddMajorId] = useState(0);

  const refresh = async () => {
    const d = await apiGet<EssayExamDetail>(`/essay-exams/${id}`);
    setData(d);
    return d;
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await refresh();
        if (!cancelled) setData(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!openAdd) return;
    Promise.all([
      apiGet<any[]>('/master/classes').catch(() => []),
      apiGet<any[]>('/master/majors').catch(() => []),
    ]).then(([c, m]) => {
      setAllClasses(Array.isArray(c) ? c : []);
      setAllMajors(Array.isArray(m) ? m : []);
    });
  }, [openAdd]);

  const addClass = async () => {
    try {
      await apiPost(`/essay-exams/${id}/classes`, { classId: addClassId, majorId: addMajorId, isActive: true });
      setOpenAdd(false);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal membuka kelas.');
    }
  };

  const removeClass = async (classOpeningId: number) => {
    if (!confirm('Tutup ujian untuk kelas ini?')) return;
    try {
      await apiDelete(`/essay-exams/classes/${classOpeningId}`);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus.');
    }
  };

  if (loading) return <PageLoader />;
  if (error || !data) {
    return (
      <div>
        <PageHeader title="Detail Ujian Essay" />
        <Card>
          <CardBody>
            <p className="text-sm text-red-700">{error || 'Ujian essay tidak ditemukan.'}</p>
            <Button className="mt-4" variant="secondary" onClick={() => router.push('/dashboard/essay-exams')}>
              ← Kembali
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={data.title}
        description={`${data.subject?.name || ''} • ${data.examType?.name || ''} • ${formatDate(data.examDate)}`}
        actions={
          <Link href="/dashboard/essay-exams">
            <Button variant="secondary">← Kembali</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-700">Soal Ujian</h2>
            </CardHeader>
            <CardBody>
              <article className="prose prose-slate max-w-none whitespace-pre-line text-sm leading-relaxed text-slate-800">
                {data.essayContent}
              </article>
            </CardBody>
          </Card>

          {user?.role === 'SISWA' && (
            <Card>
              <CardBody>
                <p className="text-sm font-semibold text-slate-700">Petunjuk untuk Siswa</p>
                <p className="mt-1 text-sm text-slate-600">
                  Unggah jawaban Anda secara langsung ke guru pengampu. Penilaian dilakukan secara manual oleh guru
                  setelah tenggat.
                </p>
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Fitur pengumpulan jawaban essay akan diaktifkan setelah modul EssayExamSubmission tersedia.
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-700">Informasi</h2>
            </CardHeader>
            <CardBody>
              <dl className="space-y-2 text-sm">
                <Row k="Mata Pelajaran" v={data.subject?.name || '-'} />
                <Row k="Semester" v={data.semester?.name || '-'} />
                <Row k="Jenis Ujian" v={data.examType?.name || '-'} />
                <Row k="Guru Pengampu" v={data.teacher?.user?.name || '-'} />
                <Row k="Tanggal" v={formatDate(data.examDate)} />
                <Row k="Jumlah Soal" v={String(data.totalQuestions)} />
              </dl>
            </CardBody>
          </Card>

          {isAdminGuru && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-700">Kelas yang Dibuka</h2>
                  <Button size="sm" onClick={() => setOpenAdd(true)}>
                    ＋ Buka Kelas
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                {data.classes && data.classes.length > 0 ? (
                  <DataTable
                    getRowId={(r: any) => r.id}
                    rows={data.classes}
                    columns={[
                      {
                        key: 'class',
                        header: 'Kelas',
                        render: (r: any) => `${r.class?.name || '-'}`,
                      },
                      { key: 'major', header: 'Jurusan', render: (r: any) => r.major?.name || '-' },
                      {
                        key: 'status',
                        header: 'Status',
                        render: (r: any) =>
                          r.isActive ? <Badge tone="emerald">Aktif</Badge> : <Badge tone="slate">Non-aktif</Badge>,
                      },
                      {
                        key: 'actions',
                        header: '',
                        render: (r: any) => (
                          <Button size="sm" variant="danger" onClick={() => removeClass(r.id)}>
                            Tutup
                          </Button>
                        ),
                        align: 'right',
                      },
                    ]}
                  />
                ) : (
                  <EmptyState icon="🏷️" title="Belum ada kelas dibuka" description="Tambahkan kelas agar siswa dapat mengikuti ujian." />
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        title="Buka Ujian untuk Kelas"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpenAdd(false)}>
              Batal
            </Button>
            <Button onClick={addClass} disabled={!addClassId || !addMajorId}>
              Simpan
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Kelas">
            <select
              value={addClassId}
              onChange={(e) => setAddClassId(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value={0}>— pilih —</option>
              {allClasses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jurusan">
            <select
              value={addMajorId}
              onChange={(e) => setAddMajorId(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value={0}>— pilih —</option>
              {allMajors.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-800">{v}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
