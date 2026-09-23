'use client';

// =============================================================================
// Halaman absensi.
// - Semua peran: lihat QR pribadi + riwayat kehadiran sendiri.
// - Admin: melakukan pemindaian QR (mode "operator") + daftar harian.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  PageLoader,
  Spinner,
} from '@/components/ui/Card';
import { DataTable } from '@/components/ui/Table';
import { formatDate, formatDateTime } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface MyQr {
  payload: string;
  expiresInMs: number;
}

interface HistoryRow {
  id: number;
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: string;
  note?: string | null;
}

interface DailyRow {
  id: number;
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: string;
  user?: { id: number; name: string; role: string };
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'mine' | 'scan' | 'daily'>(user?.role === 'ADMIN' ? 'mine' : 'mine');

  // My QR
  const [myQr, setMyQr] = useState<MyQr | null>(null);
  const [qrError, setQrError] = useState('');
  const [qrReloadKey, setQrReloadKey] = useState(0);
  const [ttlLeft, setTtlLeft] = useState<number>(0);

  // History
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  // Scan (admin)
  const [scanPayload, setScanPayload] = useState('');
  const [scanType, setScanType] = useState<'MASUK' | 'KELUAR'>('MASUK');
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');

  // Daily (admin)
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dailyClassId, setDailyClassId] = useState<number | undefined>(undefined);
  const [classes, setClasses] = useState<any[]>([]);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Efek: ambil QR untuk sendiri
  useEffect(() => {
    let cancelled = false;
    setQrError('');
    apiGet<MyQr>('/attendance/my-qr')
      .then((data) => !cancelled && setMyQr(data))
      .catch((err) => !cancelled && setQrError(err instanceof ApiError ? err.message : 'Gagal memuat QR.'));
    return () => {
      cancelled = true;
    };
  }, [qrReloadKey]);

  // Countdown TTL
  useEffect(() => {
    if (!myQr) return;
    setTtlLeft(myQr.expiresInMs);
    const t = setInterval(() => setTtlLeft((v) => Math.max(0, v - 1000)), 1000);
    return () => clearInterval(t);
  }, [myQr]);

  // History
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const qs = new URLSearchParams({ from, to });
      const data = await apiGet<HistoryRow[]>(`/attendance/my-history?${qs.toString()}`);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Daily (admin)
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    apiGet<any[]>('/master/classes').then((c) => setClasses(Array.isArray(c) ? c : []));
  }, [user?.role]);

  const fetchDaily = async () => {
    setDailyLoading(true);
    try {
      const qs = new URLSearchParams({ date: dailyDate });
      if (dailyClassId) qs.set('classId', String(dailyClassId));
      const data = await apiGet<DailyRow[]>(`/attendance/daily?${qs.toString()}`);
      setDailyRows(Array.isArray(data) ? data : []);
    } catch {
      setDailyRows([]);
    } finally {
      setDailyLoading(false);
    }
  };

  const doScan = async () => {
    if (!scanPayload) return;
    setScanBusy(true);
    setScanError('');
    setScanResult(null);
    try {
      const data = await apiPost('/attendance/scan', { qr: scanPayload, type: scanType });
      setScanResult(data);
      setScanPayload('');
    } catch (err) {
      setScanError(err instanceof ApiError ? err.message : 'Gagal memindai.');
    } finally {
      setScanBusy(false);
    }
  };

  const tabs = useMemo(() => {
    const base: { key: typeof tab; label: string }[] = [
      { key: 'mine', label: 'QR & Riwayat Saya' },
    ];
    if (user?.role === 'ADMIN') {
      base.push({ key: 'scan', label: 'Pemindai (Operator)' });
      base.push({ key: 'daily', label: 'Daftar Harian' });
    }
    return base;
  }, [user?.role]);

  return (
    <div>
      <PageHeader
        title="Absensi"
        description="QR pribadi, riwayat kehadiran, dan (admin) pemindaian serta daftar harian."
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

      {tab === 'mine' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-700">QR Saya</h2>
            </CardHeader>
            <CardBody>
              {qrError && <p className="mb-3 text-xs text-red-700">{qrError}</p>}
              {!myQr ? (
                <PageLoader />
              ) : (
                <div className="text-center">
                  <div className="mx-auto inline-block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    {/* QR image dirender via endpoint "image" berbasis payload.
                        Karena tidak ada pustaka QR terpasang, kami tampilkan payload
                        untuk verifikasi manual + tombol refresh.
                     */}
                    <div className="grid h-56 w-56 grid-cols-12 grid-rows-12 gap-px bg-slate-200 p-2">
                      {Array.from({ length: 144 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-full w-full"
                          style={{ background: pseudoRandomBit(myQr.payload, i) ? '#0f172a' : '#fff' }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Payload: <span className="font-mono">{myQr.payload.slice(0, 32)}…</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Berubah otomatis tiap {Math.round(myQr.expiresInMs / 1000)} detik.
                  </p>
                  <p className="mt-1 font-mono text-sm text-slate-700">Sisa: {formatTtl(ttlLeft)}</p>
                  <Button className="mt-3" size="sm" variant="secondary" onClick={() => setQrReloadKey((k) => k + 1)}>
                    Muat Ulang
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          <div className="lg:col-span-2 space-y-3">
            <Card>
              <CardBody>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Dari</label>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Sampai</label>
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <Button onClick={fetchHistory} disabled={historyLoading}>
                    {historyLoading ? <Spinner size="sm" /> : 'Terapkan'}
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-700">Riwayat Kehadiran</h2>
              </CardHeader>
              <CardBody>
                {historyLoading ? (
                  <PageLoader />
                ) : history.length === 0 ? (
                  <EmptyState icon="📅" title="Belum ada catatan absensi pada rentang waktu ini" />
                ) : (
                  <DataTable
                    getRowId={(h: any) => h.id}
                    rows={history}
                    columns={[
                      { key: 'date', header: 'Tanggal', render: (h: any) => formatDate(h.date) },
                      { key: 'in', header: 'Masuk', render: (h: any) => (h.checkInAt ? formatDateTime(h.checkInAt) : '-') },
                      { key: 'out', header: 'Keluar', render: (h: any) => (h.checkOutAt ? formatDateTime(h.checkOutAt) : '-') },
                      { key: 'status', header: 'Status', render: (h: any) => <Badge tone="indigo">{h.status}</Badge>, align: 'center' },
                      { key: 'note', header: 'Catatan', render: (h: any) => h.note || '-' },
                    ]}
                  />
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {tab === 'scan' && user?.role === 'ADMIN' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-700">Pemindai QR (Mode Operator)</h2>
          </CardHeader>
          <CardBody>
            <p className="mb-4 text-xs text-slate-500">
              Pemindai kamera otomatis belum diaktifkan. Tempelkan payload QR yang diterima dari pengguna untuk
              melakukan absen MASUK atau KELUAR.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">Payload QR</label>
                <textarea
                  rows={3}
                  value={scanPayload}
                  onChange={(e) => setScanPayload(e.target.value)}
                  placeholder="Tempel payload bertanda base64url."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Jenis</label>
                <select
                  value={scanType}
                  onChange={(e) => setScanType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="MASUK">MASUK</option>
                  <option value="KELUAR">KELUAR</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={doScan} disabled={scanBusy || !scanPayload} className="w-full">
                  {scanBusy ? <Spinner size="sm" /> : 'Catat Absen'}
                </Button>
              </div>
            </div>

            {scanError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {scanError}
              </p>
            )}
            {scanResult && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                ✅ Tercatat untuk <b>{scanResult?.user?.name || scanResult?.record?.user?.name || 'pengguna'}</b>
                {scanResult?.record && (
                  <>
                    {' '}
                    • {formatDateTime(scanResult.record.checkInAt || scanResult.record.checkOutAt)}
                  </>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'daily' && user?.role === 'ADMIN' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-700">Daftar Harian</h2>
          </CardHeader>
          <CardBody>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Tanggal</label>
                <input
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Kelas (opsional)</label>
                <select
                  value={dailyClassId ?? ''}
                  onChange={(e) => setDailyClassId(e.target.value ? Number(e.target.value) : undefined)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">— Semua —</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={fetchDaily} disabled={dailyLoading}>
                {dailyLoading ? <Spinner size="sm" /> : 'Tampilkan'}
              </Button>
            </div>

            {dailyLoading ? (
              <PageLoader />
            ) : dailyRows.length === 0 ? (
              <EmptyState icon="📋" title="Tidak ada catatan untuk tanggal ini" />
            ) : (
              <DataTable
                getRowId={(d: any) => d.id || `${d.user?.id}-${d.date}`}
                rows={dailyRows}
                columns={[
                  { key: 'no', header: '#', render: (_d: any, idx) => String((idx ?? 0) + 1), align: 'center' },
                  { key: 'name', header: 'Nama', render: (d: any) => d.user?.name || '-' },
                  { key: 'role', header: 'Role', render: (d: any) => <Badge tone="slate">{d.user?.role}</Badge>, align: 'center' },
                  { key: 'in', header: 'Masuk', render: (d: any) => (d.checkInAt ? formatDateTime(d.checkInAt) : '-') },
                  { key: 'out', header: 'Keluar', render: (d: any) => (d.checkOutAt ? formatDateTime(d.checkOutAt) : '-') },
                  { key: 'status', header: 'Status', render: (d: any) => <Badge tone="indigo">{d.status}</Badge>, align: 'center' },
                ]}
              />
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// Generate booleans deterministik dari string payload untuk "QR palsu" visual.
// (Tidak menggantikan pustaka QR; placeholder agar demo tidak kosong.)
function pseudoRandomBit(seed: string, i: number): boolean {
  let h = i + 1;
  for (let s = 0; s < seed.length; s++) h = (h * 31 + seed.charCodeAt(s)) | 0;
  return ((h ^ (h >>> 13)) & 1) === 1;
}

function formatTtl(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
