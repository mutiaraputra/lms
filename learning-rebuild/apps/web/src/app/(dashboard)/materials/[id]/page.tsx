'use client';

// =============================================================================
// Detail materi + daftar siswa yang tercatat membaca.
// =============================================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, ApiError } from '@/lib/api';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader, PageLoader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/Table';
import { formatBytes, formatDate, truncate } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface MaterialDetail {
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
  reads?: Array<{
    id: number;
    readAt: string;
    student?: { user?: { name: string }; nis?: string };
  }>;
}

export default function MaterialDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const id = Number(params?.id);
  const [data, setData] = useState<MaterialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await apiGet<MaterialDetail>(`/materials/${id}`);
        if (!cancelled) setData(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat materi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const markRead = async () => {
    setMarking(true);
    try {
      await apiGet(`/materials/${id}/read`);
    } catch {
      /* diamkan */
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error || !data) {
    return (
      <div>
        <PageHeader title="Detail Materi" />
        <Card>
          <CardBody>
            <p className="text-sm text-red-700">{error || 'Materi tidak ditemukan.'}</p>
            <Button className="mt-4" variant="secondary" onClick={() => router.push('/dashboard/materials')}>
              ← Kembali ke daftar materi
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const ta = data.teachingAssignment;
  const reads = data.reads || [];

  return (
    <div>
      <PageHeader
        title={data.title}
        description={`${ta?.subject?.name || '-'} • Kelas ${ta?.class?.name || '-'} • ${
          ta?.major?.name || '-'
        }`}
        actions={
          <>
            <Link href="/dashboard/materials">
              <Button variant="secondary">← Kembali</Button>
            </Link>
            {data.fileUrl && (
              <a href={data.fileUrl} target="_blank" rel="noreferrer">
                <Button>Unduh Berkas</Button>
              </a>
            )}
            {user?.role === 'SISWA' && (
              <Button variant="secondary" onClick={markRead} disabled={marking}>
                {marking ? 'Mencatat…' : 'Tandai Dibaca'}
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-700">Konten Materi</h2>
            </CardHeader>
            <CardBody>
              {data.content ? (
                <article className="prose prose-slate max-w-none whitespace-pre-line text-sm leading-relaxed text-slate-800">
                  {data.content}
                </article>
              ) : (
                <p className="text-sm text-slate-500">
                  Materi ini tidak memuat teks — gunakan tombol "Unduh Berkas" untuk membuka materi.
                </p>
              )}
            </CardBody>
          </Card>

          {data.fileName && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-700">Berkas Lampiran</h2>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{data.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {data.fileType || 'berkas'} • {formatBytes(data.fileSize)}
                    </p>
                  </div>
                  {data.fileUrl && (
                    <a href={data.fileUrl} target="_blank" rel="noreferrer">
                      <Button size="sm">Buka / Unduh</Button>
                    </a>
                  )}
                </div>
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
                <Row k="Mata Pelajaran" v={ta?.subject?.name || '-'} />
                <Row k="Kelas" v={ta?.class?.name || '-'} />
                <Row k="Jurusan" v={ta?.major?.name || '-'} />
                <Row k="Guru Pengampu" v={ta?.teacher?.user?.name || '-'} />
                <Row k="Dipublikasikan" v={formatDate(data.createdAt)} />
                <Row
                  k="Visibilitas"
                  v={
                    <Badge tone={data.isPublic ? 'emerald' : 'slate'}>{data.isPublic ? 'Publik' : 'Internal'}</Badge>
                  }
                />
              </dl>
            </CardBody>
          </Card>

          {(user?.role === 'ADMIN' || user?.role === 'GURU') && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-700">
                  Siswa yang Sudah Membaca ({reads.length})
                </h2>
              </CardHeader>
              <CardBody>
                {reads.length === 0 ? (
                  <p className="text-xs text-slate-500">Belum ada siswa yang tercatat membaca.</p>
                ) : (
                  <DataTable
                    getRowId={(r: any) => r.id}
                    rows={reads}
                    columns={[
                      { key: 'name', header: 'Nama', render: (r: any) => r.student?.user?.name || '-' },
                      { key: 'nis', header: 'NIS', render: (r: any) => r.student?.nis || '-' },
                      {
                        key: 'readAt',
                        header: 'Waktu Baca',
                        render: (r: any) =>
                          new Date(r.readAt).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          }),
                      },
                    ]}
                  />
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-800">{truncate(String(v), 40)}</dd>
    </div>
  );
}
