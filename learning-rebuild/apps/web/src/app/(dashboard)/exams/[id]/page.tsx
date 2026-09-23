'use client';

// =============================================================================
// Halaman pengerjaan ujian objektif (siswa) atau pratinjau soal (guru/admin).
// Siswa dapat memilih jawaban untuk tiap soal dan mengirim seluruh jawaban
// sekaligus. Kunci jawaban disembunyikan oleh server untuk siswa.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
} from '@/components/ui/Card';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface Question {
  id: number;
  questionText: string;
  options: Array<{ id: number; optionNumber: number; optionText: string; isCorrect?: boolean }>;
}

interface ExamDetail {
  id: number;
  title: string;
  examDate: string;
  durationMinutes: number;
  isRandom: boolean;
  totalQuestions: number;
  examType?: { name: string };
  subject?: { name: string };
  teacher?: { user?: { name: string } };
  questions: Question[];
}

export default function ExamTakePage() {
  const { id: rawId } = useParams<{ id: string }>();
  const examId = Number(rawId);
  const router = useRouter();
  const { user } = useAuth();

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<ExamDetail>(`/exams/${examId}`);
        if (!cancelled) setExam(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat ujian.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const isStudent = user?.role === 'SISWA';
  const total = exam?.questions.length || 0;
  const answered = useMemo(() => Object.keys(answers).length, [answers]);

  const submit = async () => {
    if (!exam) return;
    if (answered === 0) {
      if (!confirm('Anda belum menjawab satu soal pun. Kirim kosong?')) return;
    } else {
      if (!confirm(`Kirim ${answered} jawaban? Anda masih bisa diperbarui sebelum dikirim.`)) return;
    }
    setSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([qid, opt]) => ({
          questionId: Number(qid),
          selectedOption: opt,
        })),
      };
      const result = await apiPost(`/exams/${examId}/submit`, payload);
      setSubmitResult(result);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal mengirim jawaban.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;

  if (error || !exam) {
    return (
      <div>
        <PageHeader title="Ujian" />
        <Card>
          <CardBody>
            <p className="text-sm text-red-700">{error || 'Ujian tidak ditemukan.'}</p>
            <Button className="mt-4" variant="secondary" onClick={() => router.push('/dashboard/exams')}>
              ← Kembali
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (submitResult) {
    return (
      <div>
        <PageHeader title="Hasil Ujian" />
        <Card>
          <CardBody>
            <div className="text-center">
              <div className="mb-3 text-5xl">🎉</div>
              <h2 className="text-xl font-bold text-slate-900">{exam.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{exam.subject?.name}</p>
              <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-4 text-left">
                <Stat label="Skor" value={`${submitResult.score}`} accent="text-indigo-600" />
                <Stat
                  label="Benar / Salah / Kosong"
                  value={`${submitResult.correctCount} / ${submitResult.wrongCount} / ${submitResult.emptyCount}`}
                />
                <Stat label="Total Soal" value={String(submitResult.totalQuestions)} />
                <Stat label="Status" value="Selesai" accent="text-emerald-600" />
              </div>
              <div className="mt-8 flex justify-center gap-3">
                <Link href="/dashboard/exams">
                  <Button variant="secondary">Kembali ke Daftar Ujian</Button>
                </Link>
                <Link href="/dashboard/dashboard">
                  <Button>Ke Dashboard</Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={exam.title}
        description={`${exam.subject?.name || ''} • ${exam.examType?.name || ''} • Durasi ${
          exam.durationMinutes
        } menit`}
        actions={
          <Link href="/dashboard/exams">
            <Button variant="secondary">← Kembali</Button>
          </Link>
        }
      />

      <Card className="mb-6">
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <Info label="Tanggal" value={formatDate(exam.examDate)} />
          <Info label="Jumlah Soal" value={String(total)} />
          <Info label="Status" value={isStudent ? 'Akan Dikerjakan' : 'Pratinjau Soal'} />
        </CardBody>
      </Card>

      {exam.questions.length === 0 ? (
        <EmptyState icon="📝" title="Belum ada soal" description="Ujian ini belum memiliki bank soal." />
      ) : (
        <div className="space-y-4">
          {exam.questions.map((q, i) => (
            <Card key={q.id}>
              <CardHeader>
                <h3 className="text-sm font-semibold text-slate-700">
                  Soal {i + 1}
                  {answers[q.id] !== undefined && (
                    <Badge tone="emerald" className="ml-2">
                      Terjawab
                    </Badge>
                  )}
                </h3>
              </CardHeader>
              <CardBody>
                <p className="whitespace-pre-line text-sm text-slate-800">{q.questionText}</p>
                <div className="mt-4 space-y-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt.optionNumber;
                    const showCorrect = !isStudent && (opt as any).isCorrect;
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                          selected
                            ? 'border-indigo-500 bg-indigo-50'
                            : showCorrect
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-slate-200 hover:border-slate-300'
                        } ${isStudent ? '' : 'cursor-default'}`}
                      >
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={opt.optionNumber}
                          checked={selected}
                          disabled={!isStudent}
                          onChange={() => setAnswers((p) => ({ ...p, [q.id]: opt.optionNumber }))}
                          className="mt-0.5"
                        />
                        <span className="flex-1">
                          <span className="mr-2 font-semibold">{String.fromCharCode(64 + opt.optionNumber)}.</span>
                          {opt.optionText}
                          {showCorrect && <span className="ml-2 text-xs font-semibold text-emerald-700">(kunci)</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          ))}

          {isStudent && (
            <div className="sticky bottom-4 z-10 mt-6">
              <Card>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-600">
                    Terjawab <span className="font-semibold text-slate-800">{answered}</span> dari{' '}
                    <span className="font-semibold text-slate-800">{total}</span> soal
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setAnswers({})}>
                      Kosongkan
                    </Button>
                    <Button onClick={submit} disabled={submitting}>
                      {submitting ? 'Mengirim…' : 'Kirim Jawaban'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${accent || 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
