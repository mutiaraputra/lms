import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  prisma,
  LeaveStatus,
  AttendanceStatus,
  Role,
} from '@lms/database';
import { NotificationsService } from '../notifications/notifications.service';

/** Bentuk berkas terunggah (struktural, tanpa bergantung ke tipe ambient Multer). */
export interface UploadedProof {
  originalname: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

export interface CreateLeaveInput {
  type: string;              // mis. "Izin", "Sakit"
  reason?: string;
  leaveDate: string;         // ISO date (YYYY-MM-DD)
}

/**
 * Layanan Perizinan (Fase A4).
 *
 * Mendukung ajuan izin untuk SISWA & GURU (satu tabel LeaveRequest berelasi
 * ke User, dibedakan lewat role), unggah bukti dengan validasi ekstensi/ukuran
 * di sisi server (menggantikan CI Upload yang longgar), serta alur persetujuan
 * MENUNGGU → DITERIMA/DITOLAK oleh ADMIN. Izin yang DITERIMA menetapkan status
 * kehadiran (IZIN/SAKIT) pada tanggal terkait.
 */
@Injectable()
export class LeaveRequestsService {
  constructor(private readonly notifications: NotificationsService) {}

  // ----------------------------------------------------------------
  // AJUAN
  // ----------------------------------------------------------------
  async create(userId: number, input: CreateLeaveInput, proof?: UploadedProof) {
    const type = (input.type || '').trim();
    if (!type) throw new BadRequestException('Jenis izin wajib diisi');

    const leaveDate = new Date(input.leaveDate);
    if (isNaN(leaveDate.getTime())) {
      throw new BadRequestException('Tanggal izin tidak valid');
    }

    const proofUrl = proof ? `/uploads/leave-proofs/${proof.filename}` : null;

    const created = await prisma.leaveRequest.create({
      data: {
        userId,
        type,
        reason: input.reason?.trim() || null,
        proofUrl,
        leaveDate: new Date(
          Date.UTC(leaveDate.getUTCFullYear(), leaveDate.getUTCMonth(), leaveDate.getUTCDate()),
        ),
        status: LeaveStatus.MENUNGGU,
      },
    });

    return { message: 'Ajuan izin terkirim, menunggu konfirmasi', request: created };
  }

  // ----------------------------------------------------------------
  // DAFTAR
  // ----------------------------------------------------------------
  /** Ajuan milik user tertentu (siswa/guru melihat miliknya sendiri). */
  async listMine(userId: number) {
    return prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Daftar untuk admin, opsional filter status. */
  async listAll(status?: string) {
    const where: any = {};
    if (status) {
      const s = status.toUpperCase();
      if (!(s in LeaveStatus)) throw new BadRequestException('Status filter tidak valid');
      where.status = s as LeaveStatus;
    }
    return prisma.leaveRequest.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(id: number, requester: { id: number; role: Role }) {
    const req = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Ajuan izin tidak ditemukan');
    // Siswa/guru hanya boleh melihat miliknya; admin boleh semua.
    if (requester.role !== Role.ADMIN && req.userId !== requester.id) {
      throw new ForbiddenException('Tidak diizinkan mengakses ajuan ini');
    }
    return req;
  }

  // ----------------------------------------------------------------
  // PERSETUJUAN
  // ----------------------------------------------------------------
  private async decide(
    id: number,
    decision: LeaveStatus,
    approver: { id: number; name: string },
  ) {
    const req = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Ajuan izin tidak ditemukan');
    if (req.status !== LeaveStatus.MENUNGGU) {
      throw new BadRequestException('Ajuan ini sudah diproses sebelumnya');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.leaveRequest.update({
        where: { id },
        data: { status: decision, approverId: approver.id, approverName: approver.name },
      });

      // Izin DITERIMA → catat status kehadiran (IZIN/SAKIT) pada tanggal izin.
      if (decision === LeaveStatus.DITERIMA) {
        const attStatus = /sakit/i.test(req.type)
          ? AttendanceStatus.SAKIT
          : AttendanceStatus.IZIN;
        await tx.attendanceRecord.upsert({
          where: { userId_date: { userId: req.userId, date: req.leaveDate } },
          create: {
            userId: req.userId,
            date: req.leaveDate,
            status: attStatus,
            note: `Izin disetujui: ${req.type}`,
          },
          update: { status: attStatus, note: `Izin disetujui: ${req.type}` },
        });
      }
      return u;
    });

    // Notifikasi email hasil keputusan (bila pemohon punya email).
    const requester = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true, name: true },
    });
    if (requester?.email) {
      await this.notifications.sendLeaveDecisionEmail(requester.email, {
        name: requester.name,
        type: req.type,
        date: req.leaveDate.toISOString().slice(0, 10),
        approved: decision === LeaveStatus.DITERIMA,
        approver: approver.name,
      });
    }

    return {
      message: decision === LeaveStatus.DITERIMA ? 'Izin disetujui' : 'Izin ditolak',
      request: updated,
    };
  }

  approve(id: number, approver: { id: number; name: string }) {
    return this.decide(id, LeaveStatus.DITERIMA, approver);
  }

  reject(id: number, approver: { id: number; name: string }) {
    return this.decide(id, LeaveStatus.DITOLAK, approver);
  }
}
