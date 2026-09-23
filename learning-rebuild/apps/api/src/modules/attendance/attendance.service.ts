import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  prisma,
  AttendanceType,
  AttendanceStatus,
  Role,
} from '@lms/database';
import { getQrSecret } from '../../config/secrets';

/**
 * Layanan Absensi Inti (Fase A3).
 *
 * Menyediakan:
 *  - Penerbitan payload QR ter-tandatangan (HMAC) per user, menggantikan
 *    QR lama yang memuat NIS/NIK polos yang mudah dipalsukan.
 *  - Pemindaian QR untuk mencatat MASUK/KELUAR dengan:
 *      * validasi tanda tangan & kedaluwarsa payload,
 *      * pengecualian hari libur aktif,
 *      * validasi jendela waktu (MASUK/TERLAMBAT/KELUAR) → penentuan status,
 *      * idempoten: satu AttendanceRecord per user per hari
 *        (MASUK mengisi checkInAt, KELUAR mengisi checkOutAt).
 */
@Injectable()
export class AttendanceService {
  private readonly qrSecret = getQrSecret();

  private static readonly QR_TTL_MS = 60 * 1000; // payload QR berlaku 60 detik

  // ----------------------------------------------------------------
  // QR PAYLOAD (ter-tandatangan)
  // Format: base64url(JSON{uid,iat}) + "." + HMAC-SHA256
  // ----------------------------------------------------------------
  private sign(data: string): string {
    return crypto.createHmac('sha256', this.qrSecret).update(data).digest('base64url');
  }

  /** Terbitkan payload QR untuk seorang user. Konten inilah yang dirender jadi QR di frontend. */
  async issueQrPayload(userId: number): Promise<{ payload: string; expiresInMs: number }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const body = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString('base64url');
    const payload = `${body}.${this.sign(body)}`;
    return { payload, expiresInMs: AttendanceService.QR_TTL_MS };
  }

  /** Verifikasi payload QR → kembalikan userId bila valid & belum kedaluwarsa. */
  private verifyQrPayload(payload: string): number {
    const parts = (payload || '').split('.');
    if (parts.length !== 2) throw new BadRequestException('Format QR tidak valid');
    const [body, sig] = parts;

    const expected = this.sign(body);
    // bandingkan konstan-waktu untuk mencegah timing attack
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new BadRequestException('Tanda tangan QR tidak valid');
    }

    let decoded: { uid: number; iat: number };
    try {
      decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    } catch {
      throw new BadRequestException('Isi QR tidak dapat dibaca');
    }
    if (Date.now() - decoded.iat > AttendanceService.QR_TTL_MS) {
      throw new BadRequestException('QR sudah kedaluwarsa, minta QR baru');
    }
    return decoded.uid;
  }

  // ----------------------------------------------------------------
  // HARI LIBUR
  // ----------------------------------------------------------------
  private async isHoliday(date: Date): Promise<{ holiday: boolean; description?: string }> {
    const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const found = await prisma.holiday.findFirst({
      where: { isActive: true, date: dayStart },
    });
    return found ? { holiday: true, description: found.description ?? undefined } : { holiday: false };
  }

  // ----------------------------------------------------------------
  // JENDELA WAKTU
  // Kembalikan tipe jendela yang cocok untuk jam `now` pada scope tertentu.
  // ----------------------------------------------------------------
  private toMinutes(d: Date): number {
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }

  private async matchWindow(now: Date, expected: AttendanceType) {
    const windows = await prisma.attendanceWindow.findMany();
    const nowMin = this.toMinutes(now);

    const within = (w: { startTime: Date; endTime: Date }) => {
      const start = this.toMinutes(w.startTime);
      const end = this.toMinutes(w.endTime);
      return nowMin >= start && nowMin <= end;
    };

    if (expected === AttendanceType.MASUK) {
      // Boleh cocok jendela MASUK (→ HADIR) atau TERLAMBAT (→ TERLAMBAT)
      const masuk = windows.find((w) => w.type === AttendanceType.MASUK && within(w));
      if (masuk) return { matched: true, status: AttendanceStatus.HADIR };
      const telat = windows.find((w) => w.type === AttendanceType.TERLAMBAT && within(w));
      if (telat) return { matched: true, status: AttendanceStatus.TERLAMBAT };
      return { matched: false, status: AttendanceStatus.ALPA };
    }

    // KELUAR
    const keluar = windows.find((w) => w.type === AttendanceType.KELUAR && within(w));
    return keluar
      ? { matched: true, status: AttendanceStatus.HADIR }
      : { matched: false, status: AttendanceStatus.HADIR };
  }

  // ----------------------------------------------------------------
  // SCAN
  // ----------------------------------------------------------------
  async scan(qrPayload: string, type: AttendanceType, now = new Date()) {
    const userId = this.verifyQrPayload(qrPayload);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    if (!user.isActive) throw new ForbiddenException('Akun tidak aktif');

    // Pengecualian hari libur
    const holiday = await this.isHoliday(now);
    if (holiday.holiday) {
      throw new BadRequestException(
        `Hari ini libur${holiday.description ? ` (${holiday.description})` : ''}, absensi tidak diproses`,
      );
    }

    // Validasi jendela waktu → tentukan status
    const win = await this.matchWindow(now, type);
    if (!win.matched && type === AttendanceType.MASUK) {
      throw new BadRequestException('Di luar jendela waktu absen masuk/terlambat yang berlaku');
    }
    if (!win.matched && type === AttendanceType.KELUAR) {
      throw new BadRequestException('Di luar jendela waktu absen keluar yang berlaku');
    }

    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const existing = await prisma.attendanceRecord.findUnique({
      where: { userId_date: { userId, date: dayStart } },
    });

    // Idempotensi: cegah double-scan jenis yang sama
    if (type === AttendanceType.MASUK && existing?.checkInAt) {
      throw new BadRequestException('Absen masuk hari ini sudah tercatat');
    }
    if (type === AttendanceType.KELUAR && existing?.checkOutAt) {
      throw new BadRequestException('Absen keluar hari ini sudah tercatat');
    }
    if (type === AttendanceType.KELUAR && !existing) {
      throw new BadRequestException('Belum ada absen masuk untuk hari ini');
    }

    const classId = user.studentProfile?.classId ?? null;
    const majorId = user.studentProfile?.majorId ?? null;

    const record = await prisma.attendanceRecord.upsert({
      where: { userId_date: { userId, date: dayStart } },
      create: {
        userId,
        date: dayStart,
        checkInAt: type === AttendanceType.MASUK ? now : null,
        checkOutAt: type === AttendanceType.KELUAR ? now : null,
        status: win.status,
        classId,
        majorId,
      },
      update:
        type === AttendanceType.MASUK
          ? { checkInAt: now, status: win.status }
          : { checkOutAt: now },
    });

    return {
      message:
        type === AttendanceType.MASUK
          ? `Absen masuk tercatat (${win.status})`
          : 'Absen keluar tercatat',
      record: {
        id: record.id,
        userId: record.userId,
        name: user.name,
        date: record.date,
        checkInAt: record.checkInAt,
        checkOutAt: record.checkOutAt,
        status: record.status,
      },
    };
  }

  // ----------------------------------------------------------------
  // RIWAYAT (dasar untuk rekap Fase A5)
  // ----------------------------------------------------------------
  async history(userId: number, opts: { from?: string; to?: string } = {}) {
    const where: any = { userId };
    if (opts.from || opts.to) {
      where.date = {};
      if (opts.from) where.date.gte = new Date(opts.from);
      if (opts.to) where.date.lte = new Date(opts.to);
    }
    return prisma.attendanceRecord.findMany({ where, orderBy: { date: 'desc' } });
  }

  /** Daftar kehadiran satu hari untuk operator/admin (opsional filter kelas). */
  async dailyList(dateStr: string, classId?: number) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const dayStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const where: any = { date: dayStart };
    if (classId) where.classId = classId;
    return prisma.attendanceRecord.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { checkInAt: 'asc' },
    });
  }
}
