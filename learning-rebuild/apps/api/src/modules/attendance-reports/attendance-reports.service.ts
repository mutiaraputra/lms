import { Injectable, BadRequestException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { prisma, AttendanceStatus } from '@lms/database';

export interface RecapRow {
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

export interface RecapResult {
  period: { month: number; year: number; from: string; to: string };
  filter: { classId?: number; majorId?: number };
  rows: RecapRow[];
  totals: Omit<RecapRow, 'userId' | 'name' | 'role' | 'className' | 'majorName'>;
}

/**
 * Layanan Rekap & Export Absensi (Fase A5).
 *
 * Menghitung rekap kehadiran per periode (bulan/tahun) dengan filter kelas/
 * jurusan, menggantikan folder view `export/` + library dompdf lama. Export
 * PDF dibuat via PDFKit (streaming, tanpa headless browser).
 */
@Injectable()
export class AttendanceReportsService {
  private monthRange(month: number, year: number) {
    if (month < 1 || month > 12) throw new BadRequestException('Bulan harus 1-12');
    if (year < 2000 || year > 2100) throw new BadRequestException('Tahun tidak valid');
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0)); // hari terakhir bulan
    return { from, to };
  }

  async recap(month: number, year: number, opts: { classId?: number; majorId?: number } = {}): Promise<RecapResult> {
    const { from, to } = this.monthRange(month, year);

    const where: any = { date: { gte: from, lte: to } };
    if (opts.classId) where.classId = opts.classId;
    if (opts.majorId) where.majorId = opts.majorId;

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            studentProfile: { include: { class: true, major: true } },
          },
        },
      },
    });

    const map = new Map<number, RecapRow>();
    for (const r of records) {
      let row = map.get(r.userId);
      if (!row) {
        row = {
          userId: r.userId,
          name: r.user.name,
          role: r.user.role,
          className: r.user.studentProfile?.class?.name ?? null,
          majorName: r.user.studentProfile?.major?.name ?? null,
          hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, total: 0,
        };
        map.set(r.userId, row);
      }
      switch (r.status) {
        case AttendanceStatus.HADIR: row.hadir++; break;
        case AttendanceStatus.TERLAMBAT: row.terlambat++; break;
        case AttendanceStatus.IZIN: row.izin++; break;
        case AttendanceStatus.SAKIT: row.sakit++; break;
        case AttendanceStatus.ALPA: row.alpa++; break;
      }
      row.total++;
    }

    const rows = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    const totals = rows.reduce(
      (acc, r) => {
        acc.hadir += r.hadir; acc.terlambat += r.terlambat; acc.izin += r.izin;
        acc.sakit += r.sakit; acc.alpa += r.alpa; acc.total += r.total;
        return acc;
      },
      { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, total: 0 },
    );

    return {
      period: { month, year, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      filter: opts,
      rows,
      totals,
    };
  }

  /** Bangun PDF rekap dan kembalikan sebagai Buffer (siap dikirim sebagai respons unduhan). */
  async recapPdf(month: number, year: number, opts: { classId?: number; majorId?: number } = {}): Promise<Buffer> {
    const data = await this.recap(month, year, opts);

    const months = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(16).text('REKAP KEHADIRAN — SMK NAGARA', { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(11).text(`Periode: ${months[month]} ${year}`, { align: 'center' });
      doc.moveDown(1);

      // Tabel
      const headers = ['No', 'Nama', 'Peran', 'Kelas', 'Jurusan', 'H', 'T', 'I', 'S', 'A', 'Total'];
      const widths = [26, 190, 55, 60, 90, 28, 28, 28, 28, 28, 40];
      const startX = doc.x;
      let y = doc.y;

      const drawRow = (cells: string[], bold = false) => {
        doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica');
        let x = startX;
        cells.forEach((cell, i) => {
          doc.text(cell, x + 2, y + 3, { width: widths[i] - 4, ellipsis: true });
          x += widths[i];
        });
        doc.rect(startX, y, widths.reduce((a, b) => a + b, 0), 16).stroke();
        y += 16;
        if (y > doc.page.height - 50) { doc.addPage(); y = doc.y; }
      };

      drawRow(headers, true);
      data.rows.forEach((r, idx) => {
        drawRow([
          String(idx + 1), r.name, r.role, r.className ?? '-', r.majorName ?? '-',
          String(r.hadir), String(r.terlambat), String(r.izin), String(r.sakit), String(r.alpa), String(r.total),
        ]);
      });
      drawRow(['', 'TOTAL', '', '', '', String(data.totals.hadir), String(data.totals.terlambat), String(data.totals.izin), String(data.totals.sakit), String(data.totals.alpa), String(data.totals.total)], true);

      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').text('Keterangan: H=Hadir, T=Terlambat, I=Izin, S=Sakit, A=Alpa', startX, y + 10);

      doc.end();
    });
  }
}
