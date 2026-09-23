'use client';

// =============================================================================
// Daftar materi pembelajaran (siswa/guru/admin).
// Menampilkan materi sesuai kelas/jurusan (siswa difilter oleh API),
// guru melihat seluruh materi yang iaunggah (jika backend mengembalikan).
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, ApiError } from '@/lib/api';
import { Badge, Button, Card, CardBody, EmptyState, PageHeader, PageLoader, Spinner } from '@/components/ui/Card';
import { formatDate, formatBytes, truncate } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface Material {
  id: number;
  title: string;
  content?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: string | null;
  fileUrl?: string | null;
  isPublic: boolean;
  createdAt: string;
  teachingAssignment?: {
    subject?: { name: string };
    class?: { name: string };
    major?: { name: string };
    teacher?: { user?: { name: string } };
  };
  reads?: { id: number }[];
}

export default function MaterialsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet<Material[]>('/materials');
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat materi.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (m) =>
        m.title?.toLowerCase().includes(q) ||
        m.content?.toLowerCase().includes(q) ||
        m.teachingAssignment?.subject?.name?.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div>
      <PageHeader
        title="Materi Pembelajaran"
        description="Kumpulan materi yang dibagikan oleh guru untuk kelas dan jurusan Anda."
        actions={
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul / mata pelajaran…"
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
          icon="📚"
          title={query ? 'Tidak ada materi cocok dengan pencarian' : 'Belum ada materi'}
          description="Materi yang dibagikan guru akan tampil di sini."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MaterialCard key={m.id} material={m} canMarkRead={user?.role === 'SISWA'} />
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialCard({ material, canMarkRead }: { material: Material; canMarkRead: boolean }) {
  const ta = material.teachingAssignment;
  return (
    <Card className="flex h-full flex-col">
      <CardBody className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight text-slate-900">{material.title}</h3>
          {material.fileType && <Badge tone="indigo">{material.fileType.replace('.', '').toUpperCase()}</Badge>}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
          {ta?.subject?.name && <Badge tone="slate">{ta.subject.name}</Badge>}
          {ta?.class?.name && <Badge tone="sky">Kelas {ta.class.name}</Badge>}
          {ta?.major?.name && <Badge tone="violet">{ta.major.name}</Badge>}
        </div>
        {material.content && (
          <p className="mt-3 text-sm text-slate-600">{truncate(material.content, 180)}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div>
            {ta?.teacher?.user?.name && <span>👤 {ta.teacher.user.name}</span>}
            <span className="ml-3">🗓 {formatDate(material.createdAt)}</span>
            {material.fileName && (
              <span className="ml-3">📎 {truncate(material.fileName, 24)} ({formatBytes(material.fileSize)})</span>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/dashboard/materials/${material.id}`}>
            <Button size="sm">Baca Materi</Button>
          </Link>
          {material.fileUrl && (
            <a href={material.fileUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary">
                Unduh Berkas
              </Button>
            </a>
          )}
          {canMarkRead && <MarkReadButton materialId={material.id} />}
        </div>
      </CardBody>
    </Card>
  );
}

function MarkReadButton({ materialId }: { materialId: number }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    setLoading(true);
    try {
      await apiGet(`/materials/${materialId}/read`);
      setDone(true);
    } catch {
      /* diamkan */
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button size="sm" variant={done ? 'ghost' : 'secondary'} onClick={onClick} disabled={loading || done}>
      {loading ? <Spinner size="sm" /> : done ? '✓ Tercatat dibaca' : 'Tandai Dibaca'}
    </Button>
  );
}
