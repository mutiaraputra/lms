'use client';

// =============================================================================
// Daftar ujian essay. CRUD penuh untuk admin/guru.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { formatDate, truncate } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/api';

interface EssayExam {
  id: number;
  title: string;
  examDate: string;
  totalQuestions: number;
  essayContent: string;
  examType?: { name: string };
  subject?: { name: string };
  semester?: { name: string };
  teacher?: { user?: { name: string } };
  classes?: Array<{ id: number; class?: { name: string }; major?: { name: string } }>;
}

interface Option {
  id: number;
  name: string;
}

export default function EssayExamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdminGuru = user?.role === 'ADMIN' || user?.role === 'GURU';

  const [items, setItems] = useState<EssayExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Form state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    examDate: new Date().toISOString().slice(0, 10),
    totalQuestions: 1,
    essayContent: '',
    examTypeId: 0,
    teacherId: user?.teacherProfile?.id || 0,
    subjectId: 0,
    semesterId: 0,
  });

  // Lookup data untuk form
  const [examTypes, setExamTypes] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [semesters, setSemesters] = useState<Option[]>([]);

  const refresh = async () => {
    const data = await apiGet<EssayExam[]>('/essay-exams');
    setItems(Array.isArray(data) ? data : []);
    return data;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await refresh();
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    Promise.all([
      apiGet<Option[]>('/master/exam-types').catch(() => []),
      apiGet<Option[]>('/master/subjects').catch(() => []),
      apiGet<Option[]>('/master/semesters').catch(() => []),
    ]).then(([t, s, sem]) => {
      setExamTypes(Array.isArray(t) ? t : []);
      setSubjects(Array.isArray(s) ? s : []);
      setSemesters(Array.isArray(sem) ? sem : []);
    });
  }, [createOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      [it.title, it.subject?.name, it.examType?.name]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [items, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiPost('/essay-exams', { ...form });
      setCreateOpen(false);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal membuat ujian.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus ujian essay ini?')) return;
    try {
      await apiDelete(`/essay-exams/${id}`);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Ujian Essay"
        description="Ujian uraian yang dibuat oleh guru dan dibuka untuk kelas/jurusan tertentu."
        actions={
          isAdminGuru && (
            <Button onClick={() => setCreateOpen(true)}>＋ Buat Ujian Essay</Button>
          )
        }
      />

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul / mapel…"
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

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
          icon="📄"
          title={search ? 'Tidak ada ujian cocok' : 'Belum ada ujian essay'}
          description={isAdminGuru ? 'Buat ujian essay baru dengan tombol di atas.' : 'Belum ada ujian essay untuk Anda.'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ex) => (
            <EssayCard key={ex.id} exam={ex} role={user?.role} onDelete={() => handleDelete(ex.id)} onOpen={() => router.push(`/dashboard/essay-exams/${ex.id}`)} />
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Buat Ujian Essay Baru"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button form="createEssayForm" type="submit" disabled={creating}>
              {creating ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        }
      >
        <form id="createEssayForm" onSubmit={handleCreate} className="space-y-3">
          <Field label="Judul Ujian">
            <input
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tanggal Ujian">
              <input
                type="date"
                required
                value={form.examDate}
                onChange={(e) => setForm((p) => ({ ...p, examDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Jumlah Pertanyaan">
              <input
                type="number"
                min={1}
                value={form.totalQuestions}
                onChange={(e) => setForm((p) => ({ ...p, totalQuestions: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Jenis Ujian">
              <Select value={form.examTypeId} onChange={(v) => setForm((p) => ({ ...p, examTypeId: v }))} options={examTypes} />
            </Field>
            <Field label="Mata Pelajaran">
              <Select value={form.subjectId} onChange={(v) => setForm((p) => ({ ...p, subjectId: v }))} options={subjects} />
            </Field>
            <Field label="Semester">
              <Select
                value={form.semesterId}
                onChange={(v) => setForm((p) => ({ ...p, semesterId: v }))}
                options={semesters}
              />
            </Field>
          </div>
          <Field label="Konten / Soal Ujian (teks)">
            <textarea
              required
              rows={6}
              value={form.essayContent}
              onChange={(e) => setForm((p) => ({ ...p, essayContent: e.target.value }))}
              placeholder="Tuliskan soal essay di sini. Setiap baris / paragraf akan menjadi pertanyaan."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}

function EssayCard({
  exam,
  role,
  onOpen,
  onDelete,
}: {
  exam: EssayExam;
  role?: Role;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardBody className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight text-slate-900">{exam.title}</h3>
          {exam.examType && <Badge tone="violet">{exam.examType.name}</Badge>}
        </div>
        <div className="mt-3 space-y-1 text-xs text-slate-500">
          {exam.subject?.name && <p>📘 {exam.subject.name}</p>}
          {exam.semester?.name && <p>📅 Semester {exam.semester.name}</p>}
          {exam.teacher?.user?.name && <p>👤 {exam.teacher.user.name}</p>}
          <p>🗓 {formatDate(exam.examDate)} • {exam.totalQuestions} soal</p>
          {exam.classes && exam.classes.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {exam.classes.slice(0, 4).map((c) => (
                <Badge key={c.id} tone="sky">
                  {c.class?.name}-{c.major?.name}
                </Badge>
              ))}
              {exam.classes.length > 4 && <Badge tone="slate">+{exam.classes.length - 4}</Badge>}
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">{truncate(exam.essayContent, 140)}</p>

        <div className="mt-auto flex gap-2 pt-4">
          <Button size="sm" onClick={onOpen}>
            Buka
          </Button>
          {(role === 'ADMIN' || role === 'GURU') && (
            <Button size="sm" variant="danger" onClick={onDelete}>
              Hapus
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
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

function Select({
  value,
  onChange,
  options,
}: {
  value: number;
  onChange: (v: number) => void;
  options: Option[];
}) {
  return (
    <select
      required
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
    >
      <option value={0}>— pilih —</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
