import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Layanan Notifikasi Email (Fase A5).
 *
 * Mengirim email aktivasi/verifikasi akun dan notifikasi status izin,
 * menggantikan CI `email` library + controller `Send` lama.
 *
 * Transport dipilih dari env:
 *  - Bila SMTP_HOST diset → SMTP nyata (produksi).
 *  - Bila tidak → transport "jsonTransport" (dev): email tidak benar-benar
 *    dikirim, isinya di-log. Ini menjaga alur tetap dapat diuji tanpa
 *    server SMTP dan tanpa mengirim email nyata secara tak sengaja.
 *
 * Catatan: antrian BullMQ (retry) adalah optimisasi lanjutan; di sini
 * pengiriman dilakukan langsung dengan boundary service yang bersih.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;
  private readonly from = process.env.MAIL_FROM || 'no-reply@smknagara.sch.id';
  private readonly appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

  constructor() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    } else {
      // Dev: tidak mengirim nyata, hasilkan JSON yang bisa di-log.
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    }
  }

  private async send(to: string, subject: string, text: string, html?: string) {
    const info = await this.transporter.sendMail({ from: this.from, to, subject, text, html });
    if ((info as any).message) {
      // jsonTransport → info.message berisi payload JSON email
      this.logger.log(`[DEV EMAIL] to=${to} subject="${subject}"`);
    } else {
      this.logger.log(`Email terkirim ke ${to} (messageId=${(info as any).messageId})`);
    }
    return info;
  }

  /** Kirim tautan aktivasi/verifikasi akun. */
  async sendVerificationEmail(to: string, token: string) {
    const link = `${this.appBaseUrl}/verify?token=${encodeURIComponent(token)}`;
    const subject = 'Aktivasi Akun — Sistem Sekolah SMK Nagara';
    const text = `Silakan aktifkan akun Anda dengan membuka tautan berikut:\n${link}\n\nTautan berlaku 24 jam.`;
    const html = `<p>Silakan aktifkan akun Anda dengan mengeklik tautan berikut:</p>
<p><a href="${link}">${link}</a></p><p>Tautan berlaku 24 jam.</p>`;
    return this.send(to, subject, text, html);
  }

  /** Notifikasi hasil keputusan izin (diterima/ditolak). */
  async sendLeaveDecisionEmail(to: string, opts: { name: string; type: string; date: string; approved: boolean; approver: string }) {
    const status = opts.approved ? 'DITERIMA' : 'DITOLAK';
    const subject = `Status Izin Anda: ${status}`;
    const text = `Halo ${opts.name},\n\nAjuan izin (${opts.type}) untuk tanggal ${opts.date} telah ${status} oleh ${opts.approver}.`;
    return this.send(to, subject, text);
  }
}
