'use client';

// =============================================================================
// Manajemen data master (admin).
// Tab: Sekolah • Kelas • Jurusan • Semester • Mapel • Jenis Ujian •
//       Jenis Perangkat • Jenis Tugas • Penugasan Guru.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut, ApiError } from '@/lib/api';
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

type Tab = 'school' | 'classes' | 'majors' | 'semesters' | 'subjects' | 'exam-types' | 'kit-types' | 'assignment-types' | 'teaching-assignments';

interface Item { id: number; name?: string; [k: string]: any }

export default function MasterDataPage() {
  const [tab, setTab] = useState<Tab>('school');

  const [school, setSchool] = useState<Item | null>(null);
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [editName, setEditName] = useState('');

  // Tabs tambahan
  const [taRows, setTaRows] = useState<any[]>([]);
  const [taLoading, setTaLoading] = useState(false);

  // School form
  const [schoolForm, setSchoolForm] = useState({ schoolName: '', principal: '', logoText: '', copyright: '' });
  const [savingSchool, setSavingSchool] = useState(false);

  const refresh = async () => {
    setError('');
    if (tab === 'school') {
      const data = await apiGet<any>('/master/school');
      setSchool(data);
      setRows([]);
      return;
    }
    if (tab === 'teaching-assignments') {
      setTaLoading(true);
      try {
        const data = await apiGet<any[]>('/master/teaching-assignments');
        setTaRows(Array.isArray(data) ? data : []);
      } finally {
        setTaLoading(false);
      }
      return;
    }
    const data = await apiGet<any[]>(`/master/${tab}`);
    setRows(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === 'school' && school) {
      setSchoolForm({
        schoolName: school.schoolName || '',
        principal: school.principal || '',
        logoText: school.logoText || '',
        copyright: school.copyright || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school, tab]);

  const create = async () => {
    if (!nameInput.trim()) return;
    try {
      await apiPost(`/master/${tab}`, { name: nameInput });
      setCreateOpen(false);
      setNameInput('');
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal membuat data.');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Hapus data ini? Jika dipakai oleh entitas lain, operasi akan ditolak.')) return;
    try {
      await apiDelete(`/master/${tab}/${id}`);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus.');
    }
  };

  const openEdit = (row: Item) => {
    setEditTarget(row);
    setEditName(String(row.name || ''));
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    try {
      await apiPut(`/master/${tab}/${editTarget.id}`, { name: editName });
      setEditOpen(false);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal mengubah.');
    }
  };

  const saveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchool(true);
    try {
      await apiPut('/master/school', schoolForm);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menyimpan.');
    } finally {
      setSavingSchool(false);
    }
  };

  const tabs = useMemo(
    () => [
      { key: 'school' as const, label: 'Sekolah', allowCreate: false },
      { key: 'classes' as const, label: 'Kelas', allowCreate: true },
      { key: 'majors' as const, label: 'Jurusan', allowCreate: true },
      { key: 'semesters' as const, label: 'Semester', allowCreate: true },
      { key: 'subjects' as const, label: 'Mata Pelajaran', allowCreate: true },
      { key: 'exam-types' as const, label: 'Jenis Ujian', allowCreate: true },
      { key: 'kit-types' as const, label: 'Jenis Perangkat', allowCreate: true },
      { key: 'assignment-types' as const, label: 'Jenis Tugas', allowCreate: true },
      { key: 'teaching-assignments' as const, label: 'Penugasan Guru', allowCreate: false },
    ],
    [],
  );

  return (
    <div>
      <PageHeader title="Data Master" description="Kelola identitas sekolah, kelas, jurusan, mata pelajaran, jenis, dan penugasan guru." />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardBody>
            <p className="text-sm text-red-700">{error}</p>
          </CardBody>
        </Card>
      )}

      {tab === 'school' ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-700">Identitas Sekolah</h2>
          </CardHeader>
          <CardBody>
            {!school ? (
              <PageLoader />
            ) : (
              <form onSubmit={saveSchool} className="space-y-3">
                <Field label="Nama Sekolah">
                  <input
                    required
                    value={schoolForm.schoolName}
                    onChange={(e) => setSchoolForm((p) => ({ ...p, schoolName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Kepala Sekolah">
                    <input
                      value={schoolForm.principal}
                      onChange={(e) => setSchoolForm((p) => ({ ...p, principal: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Teks Logo (singkatan)">
                    <input
                      value={schoolForm.logoText}
                      onChange={(e) => setSchoolForm((p) => ({ ...p, logoText: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>
                </div>
                <Field label="Copyright">
                  <input
                    value={schoolForm.copyright}
                    onChange={(e) => setSchoolForm((p) => ({ ...p, copyright: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit" disabled={savingSchool}>
                    {savingSchool ? 'Menyimpan…' : 'Simpan'}
                  </Button>
                </div>
              </form>
            )}
          </CardBody>
        </Card>
      ) : tab === 'teaching-assignments' ? (
        <TeachingAssignmentView rows={taRows} loading={taLoading} />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Daftar {tabs.find((t) => t.key === tab)?.label}</h2>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                ＋ Tambah
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <PageLoader />
            ) : rows.length === 0 ? (
              <EmptyState icon="📦" title="Belum ada data" description="Tambahkan data pertama Anda." />
            ) : (
              <DataTable
                getRowId={(r: any) => r.id}
                rows={rows}
                columns={[
                  { key: 'no', header: '#', render: (_r: any, idx) => String((idx ?? 0) + 1), align: 'center' },
                  ...(tab === 'semesters'
                    ? [
                        {
                          key: 'active',
                          header: 'Status',
                          render: (r: any) =>
                            r.isActive ? <Badge tone="emerald">Aktif</Badge> : <Badge tone="slate">Non-aktif</Badge>,
                          align: 'center' as const,
                        },
                      ]
                    : []),
                  { key: 'name', header: 'Nama', render: (r: any) => r.name },
                  {
                    key: 'createdAt',
                    header: 'Dibuat',
                    render: (r: any) => (r.createdAt ? formatDate(r.createdAt) : '-'),
                  },
                  {
                    key: 'actions',
                    header: '',
                    render: (r: any) => (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                          Ubah
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => remove(r.id)}>
                          Hapus
                        </Button>
                      </div>
                    ),
                    align: 'right',
                  },
                ]}
              />
            )}
          </CardBody>
        </Card>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`Tambah ${tabs.find((t) => t.key === tab)?.label || ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button onClick={create} disabled={!nameInput.trim()}>
              Simpan
            </Button>
          </div>
        }
      >
        <Field label="Nama">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Ubah ${tabs.find((t) => t.key === tab)?.label || ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={saveEdit}>Simpan</Button>
          </div>
        }
      >
        <Field label="Nama">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
      </Modal>
    </div>
  );
}

function TeachingAssignmentView({ rows, loading }: { rows: any[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-700">Penugasan Mengajar</h2>
      </CardHeader>
      <CardBody>
        {loading ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="🧑‍🏫"
            title="Belum ada penugasan"
            description="Tambahkan melalui modul Teaching Assignments API (/teaching-assignments)."
          />
        ) : (
          <DataTable
            getRowId={(r: any) => r.id}
            rows={rows}
            columns={[
              { key: 'no', header: '#', render: (_r: any, idx) => String((idx ?? 0) + 1), align: 'center' },
              {
                key: 'teacher',
                header: 'Guru',
                render: (r: any) => r.teacher?.user?.name || '-',
              },
              { key: 'subject', header: 'Mapel', render: (r: any) => r.subject?.name || '-' },
              { key: 'class', header: 'Kelas', render: (r: any) => r.class?.name || '-' },
              { key: 'major', header: 'Jurusan', render: (r: any) => r.major?.name || '-' },
              { key: 'semester', header: 'Semester', render: (r: any) => r.semester?.name || '-' },
            ]}
          />
        )}
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
