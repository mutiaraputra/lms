'use client';

// =============================================================================
// Halaman perizinan.
// - Semua peran: mengajukan izin (dengan bukti opsional) + lihat riwayat sendiri.
// - Admin: melihat semua ajuan, menyetujui/menolaknya.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, apiPost, apiUpload, ApiError } from '@/lib/api';
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
  Spinner,
} from '@/components/ui/Card';
import { DataTable } from '@/components/ui/Table';
import { formatBytes, formatDate, formatDateTime, truncate } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface LeaveRow {
  id: number;
  type: string;
  reason?: string | null;
  proofUrl?: string | null;
  leaveDate: string;
  status: 'MENUNGGU' | 'DITERIMA' | 'DITOLAK';
  approverName?: string | null;
  createdAt: string;
  user?: { id: number; name: string; role: string };
}

export default function LeavePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [tab, setTab] = useState<'mine' | 'all'>(isAdmin ? 'all' : 'mine');

  // Ajuan
  const [form, setForm] = useState({ type: 'Izin', reason: '', leaveDate: new Date().toISOString().slice(0, 10) });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Lists
  const [mine, setMine] = useState<LeaveRow[]>([]);
  const [all, setAll] = useState<LeaveRow[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MENUNGGU' | 'DITERIMA' | 'DITOLAK'>('ALL');

  // Detail modal
  const [detail, setDetail] = useState<LeaveRow | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshMine = async () => {
    setLoadingMine(true);
    try {
      const data = await apiGet<LeaveRow[]>('/leave-requests/mine');
      setMine(Array.isArray(data) ? data : []);
    } finally {
      setLoadingMine(false);
    }
  };

  const refreshAll = async () => {
    setLoadingAll(true);
    try {
      const qs = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
      const data = await apiGet<LeaveRow[]>(`/leave-requests${qs}`);
      setAll(Array.isArray(data) ? data : []);
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    refreshMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === 'all') refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, statusFilter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      if (file) {
        const fd = new FormData();
        fd.append('type', form.type);
        if (form.reason) fd.append('reason', form.reason);
        fd.append('leaveDate', form.leaveDate);
        fd.append('proof', file);
        await apiUpload('/leave-requests', fd);
      } else {
        await apiPost('/leave-requests', form);
      }
      setMessage('Ajuan izin terkirim, menunggu persetujuan admin.');
      setForm({ type: 'Izin', reason: '', leaveDate: new Date().toISOString().slice(0, 10) });
      setFile(null);
      await refreshMine();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Gagal mengirim ajuan.');
    } finally {
      setSubmitting(false);
    }
  };

  const approve = async (id: number) => {
    if (!confirm('Setujui ajuan izin ini?')) return;
    setBusy(true);
    try {
      await apiPatch(`/leave-requests/${id}/approve`);
      await refreshAll();
      setDetail(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menyetujui.');
    } finally {
      setBusy(false);
    }
  };

  const reject = async (id: number) => {
    if (!confirm('Tolak ajuan izin ini?')) return;
    setBusy(true);
    try {
      await apiPatch(`/leave-requests/${id}/reject`);
      await refreshAll();
      setDetail(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menolak.');
    } finally {
      setBusy(false);
    }
  };

  const tabs = useMemo(() => {
    const base: { key: typeof tab; label: string }[] = [{ key: 'mine', label: 'Ajuan Saya' }];
    if (isAdmin) base.push({ key: 'all', label: 'Semua Ajuan (Admin)' });
    return base;
  }, [isAdmin]);

  return (
    <div>
      <PageHeader
        title="Perizinan"
        description="Ajukan izin / sakit dan lihat status persetujuannya."
      />

      <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {tab === 'mine' ? (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-700">Riwayat Ajuan Saya</h2>
              </CardHeader>
              <CardBody>
                {loadingMine ? (
                  <PageLoader />
                ) : mine.length === 0 ? (
                  <EmptyState
                    icon="✉️"
                    title="Belum ada ajuan izin"
                    description="Anda dapat mengajukan izin melalui formulir di samping."
                  />
                ) : (
                  <DataTable
                    getRowId={(r: any) => r.id}
                    rows={mine}
                    columns={[
                      { key: 'date', header: 'Tanggal Izin', render: (r: any) => formatDate(r.leaveDate) },
                      { key: 'type', header: 'Jenis', render: (r: any) => <Badge tone="slate">{r.type}</Badge> },
                      { key: 'reason', header: 'Alasan', render: (r: any) => truncate(r.reason || '-', 60) },
                      { key: 'proof', header: 'Bukti', render: (r: any) => r.proofUrl ? <a href={r.proofUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-700 hover:underline">Lihat</a> : '-' },
                      {
                        key: 'status',
                        header: 'Status',
                        render: (r: any) => <StatusBadge status={r.status} />,
                        align: 'center',
                      },
                      {
                        key: 'createdAt',
                        header: 'Diajukan',
                        render: (r: any) => formatDateTime(r.createdAt),
                      },
                      {
                        key: 'actions',
                        header: '',
                        render: (r: any) => (
                          <Button size="sm" variant="secondary" onClick={() => setDetail(r)}>
                            Detail
                          </Button>
                        ),
                        align: 'right',
                      },
                    ]}
                  />
                )}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-700">Daftar Semua Ajuan</h2>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="MENUNGGU">Menunggu</option>
                    <option value="DITERIMA">Diterima</option>
                    <option value="DITOLAK">Ditolak</option>
                  </select>
                </div>
              </CardHeader>
              <CardBody>
                {loadingAll ? (
                  <PageLoader />
                ) : all.length === 0 ? (
                  <EmptyState icon="📭" title="Tidak ada ajuan untuk filter ini" />
                ) : (
                  <DataTable
                    getRowId={(r: any) => r.id}
                    rows={all}
                    columns={[
                      { key: 'user', header: 'Pemohon', render: (r: any) => <span className="font-medium text-slate-800">{r.user?.name || '-'}</span> },
                      { key: 'role', header: 'Role', render: (r: any) => <Badge tone="slate">{r.user?.role}</Badge>, align: 'center' },
                      { key: 'date', header: 'Tanggal Izin', render: (r: any) => formatDate(r.leaveDate) },
                      { key: 'type', header: 'Jenis', render: (r: any) => r.type },
                      { key: 'reason', header: 'Alasan', render: (r: any) => truncate(r.reason || '-', 60) },
                      { key: 'proof', header: 'Bukti', render: (r: any) => r.proofUrl ? <a href={r.proofUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-700 hover:underline">Lihat</a> : '-' },
                      {
                        key: 'status',
                        header: 'Status',
                        render: (r: any) => <StatusBadge status={r.status} />,
                        align: 'center',
                      },
                      {
                        key: 'actions',
                        header: '',
                        render: (r: any) =>
                          r.status === 'MENUNGGU' ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="secondary" onClick={() => setDetail(r)}>
                                Detail
                              </Button>
                              <Button size="sm" onClick={() => approve(r.id)} disabled={busy}>
                                Setujui
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => reject(r.id)} disabled={busy}>
                                Tolak
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="secondary" onClick={() => setDetail(r)}>
                                Detail
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
        </div>

        <div>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-700">Form Ajuan Izin</h2>
            </CardHeader>
            <CardBody>
              {message && (
                <p
                  className={`mb-3 rounded-lg px-3 py-2 text-xs ${
                    message.startsWith('Ajuan') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {message}
                </p>
              )}
              <form onSubmit={submit} className="space-y-3">
                <Field label="Jenis">
                  <select
                    required
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option>Izin</option>
                    <option>Sakit</option>
                    <option>Cuti</option>
                    <option>Dinas Luar</option>
                  </select>
                </Field>
                <Field label="Tanggal Izin">
                  <input
                    type="date"
                    required
                    value={form.leaveDate}
                    onChange={(e) => setForm((p) => ({ ...p, leaveDate: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Alasan (opsional)">
                  <textarea
                    rows={3}
                    value={form.reason}
                    onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Bukti (jpg/png, maks 2MB)">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  {file && (
                    <p className="mt-1 text-xs text-slate-500">
                      📎 {file.name} ({formatBytes(file.size)})
                    </p>
                  )}
                </Field>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Spinner size="sm" /> : 'Kirim Ajuan'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Detail Ajuan Izin"
        size="md"
        footer={
          detail?.status === 'MENUNGGU' && isAdmin ? (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Tutup
              </Button>
              <Button variant="danger" onClick={() => detail && reject(detail.id)} disabled={busy}>
                Tolak
              </Button>
              <Button onClick={() => detail && approve(detail.id)} disabled={busy}>
                Setujui
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Tutup
              </Button>
            </div>
          )
        }
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <Row k="Pemohon" v={detail.user?.name || '-'} />
            <Row k="Role" v={detail.user?.role || '-'} />
            <Row k="Jenis" v={detail.type} />
            <Row k="Tanggal Izin" v={formatDate(detail.leaveDate)} />
            <Row k="Alasan" v={detail.reason || '-'} />
            <Row
              k="Bukti"
              v={
                detail.proofUrl ? (
                  <a className="text-indigo-700 hover:underline" href={detail.proofUrl} target="_blank" rel="noreferrer">
                    Lihat gambar
                  </a>
                ) : (
                  '-'
                )
              }
            />
            <Row k="Status" v={<StatusBadge status={detail.status} />} />
            <Row k="Diajukan" v={formatDateTime(detail.createdAt)} />
            {detail.approverName && <Row k="Diproses oleh" v={detail.approverName} />}
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'DITERIMA') return <Badge tone="emerald">Diterima</Badge>;
  if (status === 'DITOLAK') return <Badge tone="red">Ditolak</Badge>;
  return <Badge tone="amber">Menunggu</Badge>;
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
