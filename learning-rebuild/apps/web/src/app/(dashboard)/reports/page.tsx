'use client';

// =============================================================================
// Halaman rekap nilai ujian objektif & tugas (guru/admin). Mendukung:
// - Mengetik ID ujian/tugas untuk melihat rekap JSON.
// - Mengambil dari query string (?examId / ?assignmentId).
// - Mengunduh PDF rekap.
// =============================================================================

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

interface ExamRecap {
  exam: { id: number; title: string; subject: string; totalQuestions: number };
  rows: Array<{
    studentId: number;
    name: string;
    className: string | null;
    correctCount: number;
    wrongCount: number;
    emptyCount: number;
    score: number;
  }>;
  summary: { participants: number; average: number; highest: number; lowest: number };
}

interface AssignmentRecap {
  assignment: { id: number; title: string; subject: string };
  rows: Array<{
    studentId: number;
    name: string;
    className: string | null;
    submittedAt: string;
    score: number | null;
    graded: boolean;
  }>;
  summary: { submissions: number; graded: number; average: number | null };
}

type Tab = 'exam' | 'assignment';

function ReportsPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialExam = params?.get('examId') || '';
  const initialAssignment = params?.get('assignmentId') || '';

  const [tab, setTab] = useState<Tab>(initialAssignment ? 'assignment' : 'exam');
  const [examId, setExamId] = useState(initialExam);
  const [assignmentId, setAssignmentId] = useState(initialAssignment);
  const [busy, setBusy] = useState(false);

  const [examList, setExamList] = useState<any[]>([]);
  const [assignmentList, setAssignmentList] = useState<any[]>([]);

  const [examRecap, setExamRecap] = useState<ExamRecap | null>(null);
  const [assignmentRecap, setAssignmentRecap] = useState<AssignmentRecap | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiGet<any[]>('/exams').catch(() => []),
      apiGet<any[]>('/assignments').catch(() => []),
    ]).then(([exs, asg]) => {
      setExamList(Array.isArray(exs) ? exs : []);
      setAssignmentList(Array.isArray(asg) ? asg : []);
    });
  }, []);

  const loadRecap = async () => {
    setError('');
    setBusy(true);
    try {
      if (tab === 'exam') {
        if (!examId) return;
        const data = await apiGet<ExamRecap>(`/reports/exams/${examId}/recap`);
        setExamRecap(data);
        setAssignmentRecap(null);
        router.replace(`/dashboard/reports?examId=${examId}`);
      } else {
        if (!assignmentId) return;
        const data = await apiGet<AssignmentRecap>(`/reports/assignments/${assignmentId}/recap`);
        setAssignmentRecap(data);
        setExamRecap(null);
        router.replace(`/dashboard/reports?assignmentId=${assignmentId}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat rekap.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if ((tab === 'exam' && initialExam) || (tab === 'assignment' && initialAssignment)) loadRecap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const downloadPdf = async () => {
    try {
      if (tab === 'exam' && examId) {
        await downloadFile(`/reports/exams/${examId}/recap.pdf`, `rekap-ujian-${examId}.pdf`);
      } else if (tab === 'assignment' && assignmentId) {
        await downloadFile(`/reports/assignments/${assignmentId}/recap.pdf`, `rekap-tugas-${assignmentId}.pdf`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunduh.';
      alert(msg);
    }
  };

  return (
    <div>
      <PageHeader
        title="Rekap Nilai"
        description="Rekap nilai ujian objektif dan tugas. Mendukung unduhan PDF."
      />

      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <TabButton active={tab === 'exam'} onClick={() => setTab('exam')}>
                Ujian Objektif
              </TabButton>
              <TabButton active={tab === 'assignment'} onClick={() => setTab('assignment')}>
                Tugas
              </TabButton>
            </div>

            {tab === 'exam' ? (
              <select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                className="min-w-[280px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">— Pilih ujian —</option>
                {examList.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.subject?.name || 'mapel'})
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={assignmentId}
                onChange={(e) => setAssignmentId(e.target.value)}
                className="min-w-[280px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">— Pilih tugas —</option>
                {assignmentList.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.subject?.name || 'mapel'})
                  </option>
                ))}
              </select>
            )}

            <Button onClick={loadRecap} disabled={busy || (tab === 'exam' ? !examId : !assignmentId)}>
              {busy ? <Spinner size="sm" /> : 'Tampilkan Rekap'}
            </Button>
            <Button
              variant="secondary"
              onClick={downloadPdf}
              disabled={tab === 'exam' ? !examId : !assignmentId}
            >
              Unduh PDF
            </Button>
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

      {busy ? <PageLoader /> : tab === 'exam' ? <ExamRecapView recap={examRecap} /> : <AssignmentRecapView recap={assignmentRecap} />}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ReportsPageInner />
    </Suspense>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function ExamRecapView({ recap }: { recap: ExamRecap | null }) {
  if (!recap) {
    return (
      <EmptyState
        icon="📊"
        title="Belum ada rekap dipilih"
        description="Pilih ujian pada kotak di atas, lalu klik 'Tampilkan Rekap'."
      />
    );
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">{recap.exam.title}</h2>
              <p className="text-xs text-slate-500">
                {recap.exam.subject} • {recap.exam.totalQuestions} soal
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="indigo">{recap.summary.participants} peserta</Badge>
              <Badge tone="emerald">Rata-rata {recap.summary.average}</Badge>
              <Badge tone="sky">Tertinggi {recap.summary.highest}</Badge>
              <Badge tone="amber">Terendah {recap.summary.lowest}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <DataTable
            getRowId={(r: any) => r.studentId}
            rows={recap.rows}
            columns={[
              { key: 'no', header: '#', render: (_r: any, idx) => String((idx ?? 0) + 1), align: 'center' },
              { key: 'name', header: 'Nama Siswa', render: (r: any) => r.name },
              { key: 'class', header: 'Kelas', render: (r: any) => r.className || '-' },
              { key: 'benar', header: 'Benar', render: (r: any) => r.correctCount, align: 'center' },
              { key: 'salah', header: 'Salah', render: (r: any) => r.wrongCount, align: 'center' },
              { key: 'kosong', header: 'Kosong', render: (r: any) => r.emptyCount, align: 'center' },
              {
                key: 'score',
                header: 'Nilai',
                render: (r: any) => (
                  <span className={`font-bold ${r.score >= 75 ? 'text-emerald-600' : r.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {r.score}
                  </span>
                ),
                align: 'center',
              },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}

function AssignmentRecapView({ recap }: { recap: AssignmentRecap | null }) {
  if (!recap) {
    return (
      <EmptyState
        icon="📊"
        title="Belum ada rekap dipilih"
        description="Pilih tugas pada kotak di atas, lalu klik 'Tampilkan Rekap'."
      />
    );
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">{recap.assignment.title}</h2>
              <p className="text-xs text-slate-500">{recap.assignment.subject}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="indigo">{recap.summary.submissions} dikumpulkan</Badge>
              <Badge tone="emerald">{recap.summary.graded} dinilai</Badge>
              <Badge tone="sky">
                Rata-rata {recap.summary.average != null ? recap.summary.average : '-'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <DataTable
            getRowId={(r: any) => r.studentId}
            rows={recap.rows}
            columns={[
              { key: 'no', header: '#', render: (_r: any, idx) => String((idx ?? 0) + 1), align: 'center' },
              { key: 'name', header: 'Nama Siswa', render: (r: any) => r.name },
              { key: 'class', header: 'Kelas', render: (r: any) => r.className || '-' },
              { key: 'date', header: 'Waktu Kumpul', render: (r: any) => r.submittedAt },
              {
                key: 'status',
                header: 'Status',
                render: (r: any) =>
                  r.graded ? <Badge tone="emerald">Dinilai</Badge> : <Badge tone="amber">Belum dinilai</Badge>,
                align: 'center',
              },
              {
                key: 'score',
                header: 'Nilai',
                render: (r: any) =>
                  r.score != null ? (
                    <span className="font-bold text-emerald-600">{r.score}</span>
                  ) : (
                    '-'
                  ),
                align: 'center',
              },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}
