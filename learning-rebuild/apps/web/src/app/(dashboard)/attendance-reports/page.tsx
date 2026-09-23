'use client';

// =============================================================================
// Rekap absensi bulanan (admin). Memilih bulan/tahun + filter kelas/jurusan,
// lalu menampilkan tabel rekap dan menyediakan unduhan PDF.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { apiGet, ApiError } from '@/lib/api';
import { downloadFile } from '@/lib/api-files';
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

interface RecapRow {
  userId: number;
  name: string;
  role: string;
  className: string | null;
  majorName: string | null;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpa: number;
  total: number;
}

interface RecapResult {
  period: { month: number; year: number; from: string; to: string };
  filter: { classId?: number; majorId?: number };
  rows: RecapRow[];
  totals: { hadir: number; terlambat: number; izin: number; sakit: number; alpa: number; total: number };
}

export default function AttendanceReportsPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [classId, setClassId] = useState<number | undefined>();
  const [majorId, setMajorId] = useState<number | undefined>();

  const [classes, setClasses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);

  const [recap, setRecap] = useState<RecapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiGet<any[]>('/master/classes').catch(() => []),
      apiGet<any[]>('/master/majors').catch(() => []),
    ]).then(([c, m]) => {
      setClasses(Array.isArray(c) ? c : []);
      setMajors(Array.isArray(m) ? m : []);
    });
  }, []);

  const fetchRecap = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        month: String(month),
        year: String(year),
      });
      if (classId) qs.set('classId', String(classId));
      if (majorId) qs.set('majorId', String(majorId));
      const data = await apiGet<RecapResult>(`/attendance-reports/recap?${qs.toString()}`);
      setRecap(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat rekap.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    const qs = new URLSearchParams({ month: String(month), year: String(year) });
    if (classId) qs.set('classId', String(classId));
    if (majorId) qs.set('majorId', String(majorId));
    try {
      await downloadFile(`/attendance-reports/recap.pdf?${qs.toString()}`, `rekap-absensi-${year}-${String(month).padStart(2, '0')}.pdf`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunduh.';
      alert(msg);
    }
  };

  const months = useMemo(
    () => [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Rekap Absensi Bulanan"
        description="Total kehadiran per siswa/guru selama satu bulan (otomatis dihitung dari AttendanceRecord)."
      />

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Bulan</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {months.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tahun</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Kelas (opsional)</label>
              <select
                value={classId ?? ''}
                onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">— Semua —</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Jurusan (opsional)</label>
              <select
                value={majorId ?? ''}
                onChange={(e) => setMajorId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">— Semua —</option>
                {majors.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={fetchRecap} disabled={loading} className="flex-1">
                {loading ? <Spinner size="sm" /> : 'Tampilkan'}
              </Button>
              <Button variant="secondary" onClick={downloadPdf} className="flex-1">
                PDF
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardBody>
            <p className="text-sm text-red-700">{error}</p>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <PageLoader />
      ) : recap ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {months[recap.period.month - 1]} {recap.period.year}
                </h2>
                <p className="text-xs text-slate-500">
                  Periode {recap.period.from} → {recap.period.to}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="emerald">{recap.totals.hadir} hadir</Badge>
                <Badge tone="amber">{recap.totals.terlambat} terlambat</Badge>
                <Badge tone="sky">{recap.totals.izin} izin</Badge>
                <Badge tone="violet">{recap.totals.sakit} sakit</Badge>
                <Badge tone="red">{recap.totals.alpa} alpa</Badge>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {recap.rows.length === 0 ? (
              <EmptyState icon="📈" title="Tidak ada data pada periode ini" />
            ) : (
              <DataTable
                getRowId={(r: any) => r.userId}
                rows={recap.rows}
                columns={[
                  { key: 'no', header: '#', render: (_r: any, idx) => String((idx ?? 0) + 1), align: 'center' },
                  { key: 'name', header: 'Nama', render: (r: any) => r.name },
                  { key: 'role', header: 'Role', render: (r: any) => <Badge tone="slate">{r.role}</Badge>, align: 'center' },
                  { key: 'class', header: 'Kelas', render: (r: any) => r.className || '-' },
                  { key: 'major', header: 'Jurusan', render: (r: any) => r.majorName || '-' },
                  { key: 'hadir', header: 'Hadir', render: (r: any) => <Badge tone="emerald">{r.hadir}</Badge>, align: 'center' },
                  { key: 'telat', header: 'Terlambat', render: (r: any) => <Badge tone="amber">{r.terlambat}</Badge>, align: 'center' },
                  { key: 'izin', header: 'Izin', render: (r: any) => r.izin, align: 'center' },
                  { key: 'sakit', header: 'Sakit', render: (r: any) => r.sakit, align: 'center' },
                  { key: 'alpa', header: 'Alpa', render: (r: any) => <Badge tone="red">{r.alpa}</Badge>, align: 'center' },
                  { key: 'total', header: 'Total', render: (r: any) => r.total, align: 'center' },
                ]}
              />
            )}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
