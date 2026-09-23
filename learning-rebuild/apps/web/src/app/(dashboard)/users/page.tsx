'use client';

// =============================================================================
// Manajemen pengguna (admin).
// - Melihat daftar user per role (Admin/Guru/Siswa), filter status aktif.
// - Mengaktifkan & menonaktifkan akun.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, ApiError } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  PageHeader,
  PageLoader,
} from '@/components/ui/Card';
import { DataTable } from '@/components/ui/Table';
import { formatDate } from '@/lib/format';

interface UserRow {
  id: number;
  username: string;
  email?: string | null;
  name: string;
  role: 'ADMIN' | 'GURU' | 'SISWA';
  isActive: boolean;
  createdAt: string;
  teacherProfile?: { nik?: string };
  studentProfile?: { nis?: string; class?: { name: string }; major?: { name: string } };
}

export default function UsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'ADMIN' | 'GURU' | 'SISWA'>('ALL');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = async () => {
    const url = filterRole === 'ALL' ? '/users' : `/users?role=${filterRole}`;
    const data = await apiGet<UserRow[]>(url);
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRole]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const toggle = async (u: UserRow) => {
    const target = !u.isActive;
    if (!confirm(`${target ? 'Aktifkan' : 'Nonaktifkan'} akun ${u.name}?`)) return;
    setBusyId(u.id);
    try {
      await apiPatch(`/users/${u.id}/status`, { isActive: target });
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal mengubah status.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Pengguna"
        description="Daftar semua akun pada sistem (admin, guru, siswa)."
      />

      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Role</label>
              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                {(['ALL', 'ADMIN', 'GURU', 'SISWA'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRole(r)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      filterRole === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {r === 'ALL' ? 'Semua' : r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="mb-1 block text-xs font-medium text-slate-700">Cari</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama / username / email…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardBody>
            <p className="text-sm text-red-700">{error}</p>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <PageLoader />
      ) : (
        <DataTable
          getRowId={(u) => u.id}
          rows={filtered}
          columns={[
            { key: 'no', header: '#', render: (_u: any, idx) => String((idx ?? 0) + 1), align: 'center' },
            {
              key: 'name',
              header: 'Nama',
              render: (u: UserRow) => (
                <div>
                  <p className="font-semibold text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-500">
                    @{u.username} {u.email && `· ${u.email}`}
                  </p>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              render: (u: UserRow) => {
                const tone = u.role === 'ADMIN' ? 'indigo' : u.role === 'GURU' ? 'violet' : 'sky';
                return <Badge tone={tone as any}>{u.role}</Badge>;
              },
              align: 'center',
            },
            {
              key: 'identifier',
              header: 'Identitas',
              render: (u: UserRow) =>
                u.role === 'SISWA'
                  ? `NIS ${u.studentProfile?.nis || '-'}${u.studentProfile?.class?.name ? ' · ' + u.studentProfile.class.name : ''}`
                  : u.role === 'GURU'
                  ? `NIK ${u.teacherProfile?.nik || '-'}`
                  : '-',
            },
            {
              key: 'status',
              header: 'Status',
              render: (u: UserRow) =>
                u.isActive ? <Badge tone="emerald">Aktif</Badge> : <Badge tone="slate">Non-aktif</Badge>,
              align: 'center',
            },
            {
              key: 'createdAt',
              header: 'Dibuat',
              render: (u: UserRow) => formatDate(u.createdAt),
            },
            {
              key: 'actions',
              header: '',
              render: (u: UserRow) => (
                <Button
                  size="sm"
                  variant={u.isActive ? 'danger' : 'secondary'}
                  onClick={() => toggle(u)}
                  disabled={busyId === u.id}
                >
                  {busyId === u.id ? '...' : u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
              ),
              align: 'right',
            },
          ]}
        />
      )}
    </div>
  );
}
