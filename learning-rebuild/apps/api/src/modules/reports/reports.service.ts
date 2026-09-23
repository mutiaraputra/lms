import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { prisma } from '@lms/database';

export interface ExamRecapRow {
  studentId: number;
  name: string;
  className: string | null;
  correctCount: number;
  wrongCount: number;
  emptyCount: number;
  score: number;
}

export interface ExamRecapResult {
  exam: { id: number; title: string; subject: string; totalQuestions: number };
  rows: ExamRecapRow[];
  summary: { participants: number; average: number; highest: number; lowest: number };
}

export interface AssignmentRecapRow {
  studentId: number;
  name: string;
  className: string | null;
  submittedAt: string;
  score: number | null;
  graded: boolean;
}

export interface AssignmentRecapResult {
  assignment: { id: number; title: string; subject: string };
  rows: AssignmentRecapRow[];
  summary: { submissions: number; graded: number; average: number | null };
}

/**
 * Modul Reports (Fase 7) — rekap NILAI menggantikan folder `Report/` lama.
 * Menyediakan rekap nilai ujian objektif (dari ExamAttempt) & rekap nilai
 * tugas (dari AssignmentSubmission), beserta export PDF via PDFKit.
 */
@Injectable()
export class ReportsService {
  // ================= REKAP UJIAN OBJEKTIF =================
  async examRecap(examId: number): Promise<ExamRecapResult> {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { subject: true },
    });
    if (!exam) throw new NotFoundException('Ujian tidak ditemukan');

    const attempts = await prisma.examAttempt.findMany({
      where: { examId },
      include: { student: { include: { user: { select: { name: true } }, class: true } } },
      orderBy: { score: 'desc' },
    });

    const rows: ExamRecapRow[] = attempts.map((a) => ({
      studentId: a.studentId,
      name: a.student.user.name,
      className: a.student.class?.name ?? null,
      correctCount: a.correctCount,
      wrongCount: a.wrongCount,
      emptyCount: a.emptyCount,
      score: a.score,
    }));

    const scores = rows.map((r) => r.score);
    const summary = {
      participants: rows.length,
      average: scores.length ? parseFloat((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(2)) : 0,
      highest: scores.length ? Math.max(...scores) : 0,
      lowest: scores.length ? Math.min(...scores) : 0,
    };

    return {
      exam: { id: exam.id, title: exam.title, subject: exam.subject.name, totalQuestions: exam.totalQuestions },
      rows,
      summary,
    };
  }

  // ================= REKAP TUGAS =================
  async assignmentRecap(assignmentId: number): Promise<AssignmentRecapResult> {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { subject: true },
    });
    if (!assignment) throw new NotFoundException('Tugas tidak ditemukan');

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: { student: { include: { user: { select: { name: true } }, class: true } } },
      orderBy: { submittedAt: 'desc' },
    });

    const rows: AssignmentRecapRow[] = submissions.map((s) => ({
      studentId: s.studentId,
      name: s.student.user.name,
      className: s.student.class?.name ?? null,
      submittedAt: s.submittedAt.toISOString().slice(0, 10),
      score: s.score,
      graded: s.score != null,
    }));

    const gradedScores = rows.filter((r) => r.graded).map((r) => r.score as number);
    const summary = {
      submissions: rows.length,
      graded: gradedScores.length,
      average: gradedScores.length
        ? parseFloat((gradedScores.reduce((s, v) => s + v, 0) / gradedScores.length).toFixed(2))
        : null,
    };

    return {
      assignment: { id: assignment.id, title: assignment.title, subject: assignment.subject.name },
      rows,
      summary,
    };
  }

  // ================= PDF =================
  private buildPdf(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      build(doc);
      doc.end();
    });
  }

  private drawTable(
    doc: PDFKit.PDFDocument,
    headers: string[],
    widths: number[],
    dataRows: string[][],
  ) {
    const startX = doc.x;
    let y = doc.y;
    const rowHeight = 18;
    const totalWidth = widths.reduce((a, b) => a + b, 0);

    const drawRow = (cells: string[], bold = false) => {
      doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica');
      let x = startX;
      cells.forEach((cell, i) => {
        doc.text(cell, x + 2, y + 4, { width: widths[i] - 4, ellipsis: true });
        x += widths[i];
      });
      doc.rect(startX, y, totalWidth, rowHeight).stroke();
      y += rowHeight;
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = doc.y;
      }
    };

    drawRow(headers, true);
    dataRows.forEach((r) => drawRow(r));
  }

  async examRecapPdf(examId: number): Promise<Buffer> {
    const data = await this.examRecap(examId);
    return this.buildPdf((doc) => {
      doc.fontSize(15).text('REKAP NILAI UJIAN — SMK NAGARA', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(11).text(`${data.exam.title} — ${data.exam.subject}`, { align: 'center' });
      doc.fontSize(9).text(`Jumlah soal: ${data.exam.totalQuestions}`, { align: 'center' });
      doc.moveDown(1);

      this.drawTable(
        doc,
        ['No', 'Nama', 'Kelas', 'Benar', 'Salah', 'Kosong', 'Nilai'],
        [26, 190, 70, 45, 45, 50, 50],
        data.rows.map((r, i) => [
          String(i + 1), r.name, r.className ?? '-',
          String(r.correctCount), String(r.wrongCount), String(r.emptyCount), String(r.score),
        ]),
      );

      doc.moveDown(1);
      doc.fontSize(9).font('Helvetica-Bold')
        .text(`Peserta: ${data.summary.participants}   Rata-rata: ${data.summary.average}   Tertinggi: ${data.summary.highest}   Terendah: ${data.summary.lowest}`);
    });
  }

  async assignmentRecapPdf(assignmentId: number): Promise<Buffer> {
    const data = await this.assignmentRecap(assignmentId);
    return this.buildPdf((doc) => {
      doc.fontSize(15).text('REKAP NILAI TUGAS — SMK NAGARA', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(11).text(`${data.assignment.title} — ${data.assignment.subject}`, { align: 'center' });
      doc.moveDown(1);

      this.drawTable(
        doc,
        ['No', 'Nama', 'Kelas', 'Dikumpulkan', 'Nilai'],
        [26, 200, 80, 100, 60],
        data.rows.map((r, i) => [
          String(i + 1), r.name, r.className ?? '-', r.submittedAt, r.graded ? String(r.score) : 'Belum dinilai',
        ]),
      );

      doc.moveDown(1);
      doc.fontSize(9).font('Helvetica-Bold')
        .text(`Pengumpulan: ${data.summary.submissions}   Sudah dinilai: ${data.summary.graded}   Rata-rata: ${data.summary.average ?? '-'}`);
    });
  }
}
