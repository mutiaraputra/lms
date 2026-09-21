import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { prisma } from '@lms/database';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Layanan verifikasi/aktivasi akun berbasis token acak.
 *
 * Menggantikan mekanisme `kode_unik` lama aplikasi absen
 * (base64 "nis=tanggal") yang mudah ditebak. Token di sini:
 *  - dibangkitkan kriptografis (crypto.randomBytes),
 *  - berkedaluwarsa (default 24 jam),
 *  - sekali pakai (ditandai `usedAt` setelah dikonsumsi),
 *  - mendukung beberapa keperluan (`purpose`): verifikasi email
 *    saat pendaftaran, maupun reset password.
 */
@Injectable()
export class EmailVerificationService {
  private static readonly DEFAULT_TTL_HOURS = 24;

  constructor(private readonly notifications: NotificationsService) {}

  /**
   * Buat token verifikasi baru untuk sebuah user dan keperluan tertentu.
   * Token lama yang belum terpakai untuk purpose yang sama dibatalkan
   * agar hanya satu token aktif per keperluan.
   *
   * Catatan: pengiriman email dilakukan oleh modul `notifications`
   * (Fase A5). Di sini token dikembalikan agar pemanggil/queue email
   * dapat menyusun tautan verifikasi.
   */
  async createToken(
    userId: number,
    purpose = 'EMAIL_VERIFICATION',
    ttlHours = EmailVerificationService.DEFAULT_TTL_HOURS,
  ): Promise<{ token: string; expiresAt: Date }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Batalkan token aktif sebelumnya untuk purpose yang sama (single active token)
    await prisma.emailVerificationToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: { userId, token, purpose, expiresAt },
    });

    return { token, expiresAt };
  }

  /**
   * Minta token verifikasi berdasarkan identifier user (NIS/NIK/email/username).
   * Selalu berhasil tanpa membocorkan apakah akun ada (mencegah user enumeration);
   * token hanya benar-benar dibuat bila user ditemukan & belum aktif.
   */
  async requestVerification(identifier: string): Promise<{ message: string; token?: string }> {
    const clean = (identifier || '').trim();
    if (!clean) throw new BadRequestException('Identifier wajib diisi');

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: clean },
          { username: `siswa_${clean}` },
          { username: `guru_${clean}` },
          { email: clean.toLowerCase() },
          { studentProfile: { nis: clean } },
          { teacherProfile: { nik: clean } },
        ],
      },
    });

    const genericMessage =
      'Jika akun terdaftar dan belum aktif, tautan verifikasi telah dikirim ke email terkait.';

    if (!user || user.isActive) {
      return { message: genericMessage };
    }

    const { token } = await this.createToken(user.id, 'EMAIL_VERIFICATION');
    // Kirim email verifikasi bila user punya alamat email.
    if (user.email) {
      await this.notifications.sendVerificationEmail(user.email, token);
    }
    return { message: genericMessage, token };
  }

  /**
   * Konsumsi token verifikasi: validasi keberadaan, kedaluwarsa, dan
   * status terpakai; lalu aktifkan akun (is_active = true).
   */
  async confirmVerification(token: string): Promise<{ message: string; userId: number }> {
    const clean = (token || '').trim();
    if (!clean) throw new BadRequestException('Token wajib diisi');

    const record = await prisma.emailVerificationToken.findUnique({
      where: { token: clean },
    });

    if (!record || record.purpose !== 'EMAIL_VERIFICATION') {
      throw new BadRequestException('Token verifikasi tidak valid');
    }
    if (record.usedAt) {
      throw new BadRequestException('Token verifikasi sudah pernah digunakan');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Token verifikasi telah kedaluwarsa');
    }

    // Aktivasi akun + tandai token terpakai dalam satu transaksi
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { isActive: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Akun berhasil diaktifkan, silakan login', userId: record.userId };
  }
}
