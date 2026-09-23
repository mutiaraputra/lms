'use client';

// =============================================================================
// Detail tugas: guru/admin dapat mengelola pembukaan kelas & menilai
// pengumpulan; siswa melihat soal dan mengumpulkan jawaban.
// =============================================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiUpload,
  ApiError,
} from '@/lib/api';
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
import { formatBytes, formatDate, formatDateTime, truncate } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface AssignmentClass {
  id: number;
  classId: number;
  majorId: number;
  isActive: boolean;
  class?: { name: string };
  major?: { name: string };
}

interface Submission {
  id: number;
  subject?: string | null;
  groupMembers?: string | null;
  notes?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: string | null;
  fileUrl?: string | null;
  score?: number | null;
  feedback?: string | null;
  submittedAt: string;
  student?: { nis?: string; user?: { name: string }; class?: { name: string } };
}

interface AssignmentDetail {
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
  classes?: AssignmentClass[];
  _count?: { submissions: number };
}

const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'ppt', 'pptx', 'xls', 'xlsx'];

export default function AssignmentDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Number(rawId);
  const router = useRouter();
  const { user } = useAuth();
  const isStudent = user?.role === 'SISWA';
  const isAdminGuru = user?.role === 'ADMIN' || user?.role === 'GURU';

  const [data, setData] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // siswa: form kumpul & status submit sendiri
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [submitForm, setSubmitForm] = useState({
    subject: '',
    groupMembers: '',
    notes: '',
    file: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);

  // guru/admin: daftar pengumpulan + grading
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [gradeScore, setGradeScore] = useState(0);
  const [gradeFeedback, setGradeFeedback] = useState('');

  // guru/admin: buka kelas
  const [openAdd, setOpenAdd] = useState(false);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [allMajors, setAllMajors] = useState<any[]>([]);
  const [addClassId, setAddClassId] = useState(0);
  const [addMajorId, setAddMajorId] = useState(0);

  const refreshAll = async () => {
    const d = await apiGet<AssignmentDetail>(`/assignments/${id}`);
    setData(d);
    if (isStudent) {
      try {
        const s = await apiGet<Submission | null>(`/assignments/${id}/my-submission`);
        setMySubmission(s);
      } catch {
        setMySubmission(null);
      }
    }
    if (isAdminGuru) {
      try {
        const list = await apiGet<Submission[]>(`/assignments/${id}/submissions`);
        setSubmissions(Array.isArray(list) ? list : []);
      } catch {
        setSubmissions([]);
      }
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        await refreshAll();
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

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (submitForm.subject) fd.append('subject', submitForm.subject);
      if (submitForm.groupMembers) fd.append('groupMembers', submitForm.groupMembers);
      if (submitForm.notes) fd.append('notes', submitForm.notes);
      if (submitForm.file) fd.append('file', submitForm.file);
      // The endpoint expects regular fields via body+multer, so we send JSON when no file, else FormData.
      if (submitForm.file) {
        await apiUpload(`/assignments/${id}/submit`, fd);
      } else {
        await apiPost(`/assignments/${id}/submit`, {
          subject: submitForm.subject || undefined,
          groupMembers: submitForm.groupMembers || undefined,
          notes: submitForm.notes || undefined,
        });
      }
      setSubmitForm({ subject: '', groupMembers: '', notes: '', file: null });
      await refreshAll();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal mengumpulkan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddClass = async () => {
    try {
      await apiPost(`/assignments/${id}/classes`, { classId: addClassId, majorId: addMajorId, isActive: true });
      setOpenAdd(false);
      setAddClassId(0);
      setAddMajorId(0);
      await refreshAll();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal membuka kelas.');
    }
  };

  const handleRemoveClass = async (cid: number) => {
    if (!confirm('Tutup tugas untuk kelas ini?')) return;
    try {
      await apiDelete(`/assignments/classes/${cid}`);
      await refreshAll();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menutup kelas.');
    }
  };

  const handleGrade = async () => {
    if (!gradingId) return;
    try {
      await apiPatch(`/assignments/submissions/${gradingId}/grade`, {
        score: gradeScore,
        feedback: gradeFeedback || undefined,
      });
      setGradingId(null);
      setGradeScore(0);
      setGradeFeedback('');
      await refreshAll();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menilai.');
    }
  };

  if (loading) return <PageLoader />;
  if (error || !data) {
    return (
      <div>
        <PageHeader title="Detail Tugas" />
        <Card>
          <CardBody>
            <p className="text-sm text-red-700">{error || 'Tugas tidak ditemukan.'}</p>
            <Button className="mt-4" variant="secondary" onClick={() => router.push('/dashboard/assignments')}>
              ← Kembali
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const overdue = new Date(data.dueDate) < new Date();
  const locked = !!mySubmission?.score; // sudah dinilai → terkunci per backend

  return (
    <div>
      <PageHeader
        title={data.title}
        description={`${data.subject?.name || ''} • ${data.assignmentType?.name || ''}`}
        actions={
          <>
            <Link href="/dashboard/assignments">
              <Button variant="secondary">← Kembali</Button>
            </Link>
            <Link href={`/dashboard/reports?assignmentId=${data.id}`}>
              <Button variant="secondary">Rekap</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-700">Instruksi</h2>
            </CardHeader>
            <CardBody>
              {data.instructions ? (
                <article className="prose prose-slate max-w-none whitespace-pre-line text-sm leading-relaxed text-slate-800">
                  {data.instructions}
                </article>
              ) : (
                <p className="text-sm text-slate-500">Tidak ada instruksi khusus dari guru.</p>
              )}
            </CardBody>
          </Card>

          {isStudent && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-700">Pengumpulan Tugas</h2>
              </CardHeader>
              <CardBody>
                {mySubmission ? (
                  <SubmissionView submission={mySubmission} />
                ) : (
                  <p className="mb-4 text-xs text-slate-500">
                    Anda belum mengumpulkan tugas ini. Batas waktu: {formatDate(data.dueDate)}{' '}
                    {overdue && <Badge tone="red">terlewat</Badge>}
                  </p>
                )}
                {!locked && (
                  <form onSubmit={handleSubmitAssignment} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold text-slate-700">
                      {mySubmission ? 'Perbarui Pengumpulan' : 'Kumpulkan Tugas'}
                    </p>
                    <Field label="Judul / Subject (opsional)">
                      <input
                        value={submitForm.subject}
                        onChange={(e) => setSubmitForm((p) => ({ ...p, subject: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Anggota Kelompok (opsional)">
                      <input
                        value={submitForm.groupMembers}
                        onChange={(e) => setSubmitForm((p) => ({ ...p, groupMembers: e.target.value }))}
                        placeholder="Nama anggota, pisahkan dengan koma"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Catatan (opsional)">
                      <textarea
                        rows={3}
                        value={submitForm.notes}
                        onChange={(e) => setSubmitForm((p) => ({ ...p, notes: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label={`Berkas (opsional, maks 10MB; ${ALLOWED_EXT.join(', ')})`}>
                      <input
                        type="file"
                        onChange={(e) => setSubmitForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                        accept={ALLOWED_EXT.map((e) => `.${e}`).join(',')}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      {submitForm.file && (
                        <p className="mt-1 text-xs text-slate-500">
                          📎 {submitForm.file.name} ({formatBytes(submitForm.file.size)})
                        </p>
                      )}
                    </Field>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={submitting}>
                        {submitting ? 'Mengirim…' : mySubmission ? 'Perbarui Pengumpulan' : 'Kumpulkan'}
                      </Button>
                    </div>
                  </form>
                )}
              </CardBody>
            </Card>
          )}

          {isAdminGuru && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-700">
                  Daftar Pengumpulan ({submissions.length})
                </h2>
              </CardHeader>
              <CardBody>
                {submissions.length === 0 ? (
                  <EmptyState
                    icon="📨"
                    title="Belum ada pengumpulan"
                    description="Siswa yang sudah mengumpulkan akan muncul di sini."
                  />
                ) : (
                  <DataTable
                    getRowId={(s: any) => s.id}
                    rows={submissions}
                    columns={[
                      {
                        key: 'name',
                        header: 'Siswa',
                        render: (s: any) => (
                          <div>
                            <p className="font-semibold text-slate-800">{s.student?.user?.name || '-'}</p>
                            <p className="text-xs text-slate-500">
                              NIS {s.student?.nis} • Kelas {s.student?.class?.name || '-'}
                            </p>
                          </div>
                        ),
                      },
                      {
                        key: 'submittedAt',
                        header: 'Waktu',
                        render: (s: any) => formatDateTime(s.submittedAt),
                      },
                      {
                        key: 'file',
                        header: 'Berkas',
                        render: (s: any) =>
                          s.fileUrl ? (
                            <a className="text-xs font-medium text-indigo-700 hover:underline" href={s.fileUrl} target="_blank" rel="noreferrer">
                              {truncate(s.fileName || 'Lihat', 30)} ({formatBytes(s.fileSize)})
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          ),
                      },
                      {
                        key: 'note',
                        header: 'Catatan',
                        render: (s: any) => (
                          <p className="max-w-xs text-xs text-slate-600">{truncate(s.notes || s.subject || '-', 60)}</p>
                        ),
                      },
                      {
                        key: 'score',
                        header: 'Nilai',
                        render: (s: any) =>
                          s.score != null ? (
                            <Badge tone="emerald">{s.score}</Badge>
                          ) : (
                            <Badge tone="amber">Belum dinilai</Badge>
                          ),
                        align: 'center',
                      },
                      {
                        key: 'actions',
                        header: '',
                        render: (s: any) => (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => {
                                setGradingId(s.id);
                                setGradeScore(s.score ?? 0);
                                setGradeFeedback(s.feedback || '');
                              }}
                            >
                              {s.score != null ? 'Edit Nilai' : 'Nilai'}
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-700">Informasi</h2>
            </CardHeader>
            <CardBody>
              <dl className="space-y-2 text-sm">
                <Row k="Mata Pelajaran" v={data.subject?.name || '-'} />
                <Row k="Jenis" v={data.assignmentType?.name || '-'} />
                <Row k="Guru" v={data.teacher?.user?.name || '-'} />
                <Row k="Tenggat" v={formatDate(data.dueDate)} />
                <Row k="Durasi" v={`${data.durationDays} hari`} />
                <Row k="Maks. Anggota" v={String(data.maxMembers)} />
                <Row
                  k="Pengumpulan"
                  v={<Badge tone="indigo">{data._count?.submissions ?? submissions.length}</Badge>}
                />
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
                      { key: 'class', header: 'Kelas', render: (r: any) => r.class?.name || '-' },
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
                          <Button size="sm" variant="danger" onClick={() => handleRemoveClass(r.id)}>
                            Tutup
                          </Button>
                        ),
                        align: 'right',
                      },
                    ]}
                  />
                ) : (
                  <p className="text-xs text-slate-500">Belum ada kelas dibuka untuk tugas ini.</p>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Tambah kelas */}
      <Modal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        title="Buka Tugas untuk Kelas"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpenAdd(false)}>
              Batal
            </Button>
            <Button onClick={handleAddClass} disabled={!addClassId || !addMajorId}>
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

      {/* Modal: Penilaian */}
      <Modal
        open={gradingId !== null}
        onClose={() => setGradingId(null)}
        title="Penilaian Pengumpulan"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setGradingId(null)}>
              Batal
            </Button>
            <Button onClick={handleGrade}>Simpan Nilai</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Nilai (0–100)">
            <input
              type="number"
              min={0}
              max={100}
              value={gradeScore}
              onChange={(e) => setGradeScore(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Umpan Balik / Catatan">
            <textarea
              rows={4}
              value={gradeFeedback}
              onChange={(e) => setGradeFeedback(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function SubmissionView({ submission }: { submission: Submission }) {
  return (
    <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-emerald-700">Pengumpulan Anda</p>
        <span className="text-xs text-slate-500">{formatDateTime(submission.submittedAt)}</span>
      </div>
      {submission.subject && <p className="text-slate-700">📝 {submission.subject}</p>}
      {submission.groupMembers && <p className="text-slate-600">👥 {submission.groupMembers}</p>}
      {submission.fileUrl && (
        <p>
          📎{' '}
          <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-indigo-700 hover:underline">
            {submission.fileName} ({formatBytes(submission.fileSize)})
          </a>
        </p>
      )}
      {submission.notes && (
        <p className="whitespace-pre-line rounded bg-white px-3 py-2 text-slate-700">{submission.notes}</p>
      )}
      {submission.score != null ? (
        <div className="mt-3 rounded-lg border border-emerald-300 bg-white p-3">
          <p className="font-semibold text-emerald-700">Nilai: {submission.score}</p>
          {submission.feedback && <p className="mt-1 whitespace-pre-line text-xs text-slate-600">{submission.feedback}</p>}
          <p className="mt-1 text-[11px] text-slate-400">
            Pengumpulan sudah dinilai. Tidak dapat mengubah setelahnya.
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Belum dinilai.</p>
      )}
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

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-800">{v}</dd>
    </div>
  );
}
