'use client';

// =============================================================================
// Daftar tugas (guru/admin: lihat & buat; siswa: lihat & kumpulkan).
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
  EmptyState,
  Modal,
  PageHeader,
  PageLoader,
} from '@/components/ui/Card';
import { DataTable } from '@/components/ui/Table';
import { formatDate, truncate } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/api';

interface Assignment {
  id: number;
  title: string;
  instructions?: string | null;
  dueDate: string;
  durationDays: number;
  maxMembers: number;
  assignmentType?: { name: string };
  subject?: { name: string };
  semester?: { name: string };
  teacher?: { user?: { name: string } };
  classes?: Array<{ id: number; class?: { name: string }; major?: { name: string }; isActive: boolean }>;
  _count?: { submissions: number };
}

interface Option {
  id: number;
  name: string;
}

export default function AssignmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdminGuru = user?.role === 'ADMIN' || user?.role === 'GURU';

  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    instructions: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    durationDays: 7,
    maxMembers: 1,
    assignmentTypeId: 0,
    teacherId: user?.teacherProfile?.id || 0,
    subjectId: 0,
    semesterId: 0,
  });

  const [types, setTypes] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [semesters, setSemesters] = useState<Option[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Record<number, any>>({});

  const refresh = async () => {
    const data = await apiGet<Assignment[]>('/assignments');
    setItems(Array.isArray(data) ? data : []);
    return data;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await refresh();
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
        if (!cancelled && user?.role === 'SISWA') {
          // Ambil status pengumpulan sendiri untuk tiap tugas.
          const subs: Record<number, any> = {};
          await Promise.all(
            (Array.isArray(data) ? data : []).map(async (a) => {
              try {
                const s = await apiGet(`/assignments/${a.id}/my-submission`);
                subs[a.id] = s;
              } catch {
                /* ignore */
              }
            }),
          );
          if (!cancelled) setMySubmissions(subs);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  useEffect(() => {
    if (!createOpen) return;
    Promise.all([
      apiGet<Option[]>('/master/assignment-types').catch(() => []),
      apiGet<Option[]>('/master/subjects').catch(() => []),
      apiGet<Option[]>('/master/semesters').catch(() => []),
    ]).then(([t, s, sem]) => {
      setTypes(Array.isArray(t) ? t : []);
      setSubjects(Array.isArray(s) ? s : []);
      setSemesters(Array.isArray(sem) ? sem : []);
    });
  }, [createOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      [it.title, it.subject?.name, it.assignmentType?.name, it.teacher?.user?.name]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [items, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiPost('/assignments', {
        ...form,
        // Convert dueDate to ISO string with time 23:59 UTC for dueDate
        dueDate: new Date(`${form.dueDate}T23:59:00Z`).toISOString(),
      });
      setCreateOpen(false);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal membuat tugas.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus tugas ini?')) return;
    try {
      await apiDelete(`/assignments/${id}`);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Tugas"
        description="Tugas yang dibuat oleh guru, dibuka untuk kelas/jurusan tertentu."
        actions={
          isAdminGuru && (
            <Button onClick={() => setCreateOpen(true)}>＋ Buat Tugas</Button>
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
          icon="🗂️"
          title={search ? 'Tidak ada tugas cocok' : 'Belum ada tugas'}
          description={isAdminGuru ? 'Buat tugas baru dengan tombol di atas.' : 'Belum ada tugas untuk Anda.'}
        />
      ) : isAdminGuru ? (
        <AssignmentAdminTable rows={filtered} onOpen={(id) => router.push(`/dashboard/assignments/${id}`)} onDelete={handleDelete} />
      ) : (
        <StudentAssignmentGrid rows={filtered} submissions={mySubmissions} onOpen={(id) => router.push(`/dashboard/assignments/${id}`)} />
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Buat Tugas Baru"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button form="createAssignForm" type="submit" disabled={creating}>
              {creating ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        }
      >
        <form id="createAssignForm" onSubmit={handleCreate} className="space-y-3">
          <Field label="Judul Tugas">
            <input
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </Field>
          <Field label="Instruksi (opsional)">
            <textarea
              rows={3}
              value={form.instructions}
              onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tenggat">
              <input
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Durasi (hari)">
              <input
                type="number"
                min={1}
                value={form.durationDays}
                onChange={(e) => setForm((p) => ({ ...p, durationDays: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Maks. Anggota">
              <input
                type="number"
                min={1}
                value={form.maxMembers}
                onChange={(e) => setForm((p) => ({ ...p, maxMembers: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Jenis Tugas">
              <select
                required
                value={form.assignmentTypeId}
                onChange={(e) => setForm((p) => ({ ...p, assignmentTypeId: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value={0}>— pilih —</option>
                {types.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mata Pelajaran">
              <select
                required
                value={form.subjectId}
                onChange={(e) => setForm((p) => ({ ...p, subjectId: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value={0}>— pilih —</option>
                {subjects.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Semester">
              <select
                required
                value={form.semesterId}
                onChange={(e) => setForm((p) => ({ ...p, semesterId: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value={0}>— pilih —</option>
                {semesters.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function AssignmentAdminTable({
  rows,
  onOpen,
  onDelete,
}: {
  rows: Assignment[];
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <DataTable
      getRowId={(r) => r.id}
      rows={rows}
      columns={[
        {
          key: 'title',
          header: 'Judul',
          render: (r: Assignment) => (
            <div>
              <p className="font-semibold text-slate-800">{r.title}</p>
              <p className="text-xs text-slate-500">{truncate(r.instructions || '', 80)}</p>
            </div>
          ),
        },
        {
          key: 'subject',
          header: 'Mapel',
          render: (r: Assignment) => r.subject?.name || '-',
        },
        {
          key: 'type',
          header: 'Jenis',
          render: (r: Assignment) => r.assignmentType?.name || '-',
        },
        {
          key: 'due',
          header: 'Tenggat',
          render: (r: Assignment) => formatDate(r.dueDate),
        },
        {
          key: 'classes',
          header: 'Kelas Dibuka',
          render: (r: Assignment) =>
            r.classes && r.classes.length ? (
              <div className="flex flex-wrap gap-1">
                {r.classes.slice(0, 3).map((c) => (
                  <Badge key={c.id} tone="sky">
                    {c.class?.name}-{c.major?.name}
                  </Badge>
                ))}
                {r.classes.length > 3 && <Badge tone="slate">+{r.classes.length - 3}</Badge>}
              </div>
            ) : (
              '-'
            ),
        },
        {
          key: 'subs',
          header: 'Pengumpulan',
          render: (r: Assignment) => (
            <Badge tone="indigo">{r._count?.submissions ?? 0}</Badge>
          ),
          align: 'center',
        },
        {
          key: 'actions',
          header: '',
          render: (r: Assignment) => (
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => onOpen(r.id)}>
                Buka
              </Button>
              <Button size="sm" variant="danger" onClick={() => onDelete(r.id)}>
                Hapus
              </Button>
            </div>
          ),
          align: 'right',
        },
      ]}
    />
  );
}

function StudentAssignmentGrid({
  rows,
  submissions,
  onOpen,
}: {
  rows: Assignment[];
  submissions: Record<number, any>;
  onOpen: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => {
        const sub = submissions[r.id];
        const submitted = !!sub;
        const graded = sub?.score != null;
        const overdue = new Date(r.dueDate) < new Date();
        return (
          <Card key={r.id} className="flex h-full flex-col">
            <CardBody className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold leading-tight text-slate-900">{r.title}</h3>
                {r.assignmentType && <Badge tone="violet">{r.assignmentType.name}</Badge>}
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                {r.subject?.name && (
                  <p>
                    📘 <span className="font-medium text-slate-700">{r.subject.name}</span>
                  </p>
                )}
                {r.teacher?.user?.name && <p>👤 {r.teacher.user.name}</p>}
                <p>🗓 Tenggat: {formatDate(r.dueDate)}</p>
              </div>
              {r.instructions && (
                <p className="mt-3 text-xs text-slate-600">{truncate(r.instructions, 140)}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {graded ? (
                  <Badge tone="emerald">Dinilai: {sub.score}</Badge>
                ) : submitted ? (
                  <Badge tone="sky">Sudah dikumpulkan</Badge>
                ) : overdue ? (
                  <Badge tone="red">Terlewat</Badge>
                ) : (
                  <Badge tone="amber">Belum dikumpulkan</Badge>
                )}
              </div>
              <div className="mt-auto flex gap-2 pt-4">
                <Button size="sm" onClick={() => onOpen(r.id)}>
                  {submitted ? 'Lihat / Edit Pengumpulan' : 'Kumpulkan'}
                </Button>
              </div>
            </CardBody>
          </Card>
        );
      })}
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
