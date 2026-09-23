import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { prisma } from '@lms/database';

export interface AssignmentInput {
  assignmentTypeId: number;
  title: string;
  instructions?: string;
  dueDate: string;
  durationDays?: number;
  maxMembers?: number;
  teacherId: number;
  subjectId: number;
  semesterId: number;
}

export interface AssignmentClassInput {
  classId: number;
  majorId: number;
  isActive?: boolean;
}

export interface SubmissionInput {
  subject?: string;
  groupMembers?: string;
  notes?: string;
}

export interface UploadedFileMeta {
  originalname: string;
  filename: string;
  size: number;
  mimetype: string;
}

/**
 * Modul Assignments/Tugas (Fase 6b). CRUD tugas + pembukaan per kelas,
 * pengumpulan berkas oleh siswa (satu pengumpulan per siswa per tugas,
 * dapat diperbarui selama masih dikumpulkan), dan penilaian manual guru
 * (score + feedback). Data historis (`tb_tugas`, `kelas_tugas`, `tugas_siswa`)
 * sudah dimigrasi via ETL.
 */
@Injectable()
export class AssignmentsService {
  private readonly include = {
    assignmentType: true,
    teacher: { include: { user: { select: { id: true, name: true } } } },
    subject: true,
    semester: true,
    classes: { include: { class: true, major: true } },
    _count: { select: { submissions: true } },
  };

  private parseDate(value: string): Date {
    const d = new Date(value);
    if (isNaN(d.getTime())) throw new BadRequestException('Tanggal tenggat tidak valid');
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  // ---------------- Assignment CRUD ----------------
  async findAll(filter: { classId?: number; majorId?: number } = {}) {
    const where: any = {};
    if (filter.classId && filter.majorId) {
      where.classes = { some: { classId: filter.classId, majorId: filter.majorId, isActive: true } };
    }
    return prisma.assignment.findMany({
      where,
      include: this.include,
      orderBy: { dueDate: 'desc' },
    });
  }

  async findOne(id: number) {
    const a = await prisma.assignment.findUnique({ where: { id }, include: this.include });
    if (!a) throw new NotFoundException('Tugas tidak ditemukan');
    return a;
  }

  private async validateRefs(input: AssignmentInput) {
    const [type, teacher, subject, semester] = await Promise.all([
      prisma.assignmentType.findUnique({ where: { id: input.assignmentTypeId } }),
      prisma.teacherProfile.findUnique({ where: { id: input.teacherId } }),
      prisma.subject.findUnique({ where: { id: input.subjectId } }),
      prisma.semester.findUnique({ where: { id: input.semesterId } }),
    ]);
    if (!type) throw new BadRequestException('Jenis tugas (assignmentTypeId) tidak ditemukan');
    if (!teacher) throw new BadRequestException('Guru (teacherId) tidak ditemukan');
    if (!subject) throw new BadRequestException('Mata pelajaran (subjectId) tidak ditemukan');
    if (!semester) throw new BadRequestException('Semester (semesterId) tidak ditemukan');
  }

  async create(input: AssignmentInput) {
    const title = (input.title ?? '').trim();
    if (!title) throw new BadRequestException('Judul tugas wajib diisi');
    if (!input.assignmentTypeId || !input.teacherId || !input.subjectId || !input.semesterId) {
      throw new BadRequestException('assignmentTypeId, teacherId, subjectId, semesterId wajib diisi');
    }
    await this.validateRefs(input);
    return prisma.assignment.create({
      data: {
        assignmentTypeId: input.assignmentTypeId,
        title,
        instructions: input.instructions?.trim() || null,
        dueDate: this.parseDate(input.dueDate),
        durationDays: input.durationDays ?? 1,
        maxMembers: input.maxMembers ?? 1,
        teacherId: input.teacherId,
        subjectId: input.subjectId,
        semesterId: input.semesterId,
      },
      include: this.include,
    });
  }

  async update(id: number, input: Partial<AssignmentInput>) {
    await this.findOne(id);
    const data: any = {};
    if (input.title !== undefined) {
      const t = input.title.trim();
      if (!t) throw new BadRequestException('Judul tidak boleh kosong');
      data.title = t;
    }
    if (input.instructions !== undefined) data.instructions = input.instructions.trim() || null;
    if (input.dueDate !== undefined) data.dueDate = this.parseDate(input.dueDate);
    if (input.durationDays !== undefined) data.durationDays = input.durationDays;
    if (input.maxMembers !== undefined) data.maxMembers = input.maxMembers;
    if (input.assignmentTypeId !== undefined) data.assignmentTypeId = input.assignmentTypeId;
    if (input.teacherId !== undefined) data.teacherId = input.teacherId;
    if (input.subjectId !== undefined) data.subjectId = input.subjectId;
    if (input.semesterId !== undefined) data.semesterId = input.semesterId;
    return prisma.assignment.update({ where: { id }, data, include: this.include });
  }

  async remove(id: number) {
    await this.findOne(id);
    await prisma.assignment.delete({ where: { id } });
    return { message: 'Tugas dihapus' };
  }

  // ---------------- Kelas yang dibuka ----------------
  async addClass(assignmentId: number, input: AssignmentClassInput) {
    await this.findOne(assignmentId);
    const [klass, major] = await Promise.all([
      prisma.class.findUnique({ where: { id: input.classId } }),
      prisma.major.findUnique({ where: { id: input.majorId } }),
    ]);
    if (!klass) throw new BadRequestException('Kelas tidak ditemukan');
    if (!major) throw new BadRequestException('Jurusan tidak ditemukan');
    return prisma.assignmentClass.upsert({
      where: {
        assignmentId_classId_majorId: {
          assignmentId,
          classId: input.classId,
          majorId: input.majorId,
        },
      },
      create: {
        assignmentId,
        classId: input.classId,
        majorId: input.majorId,
        isActive: input.isActive ?? true,
      },
      update: { isActive: input.isActive ?? true },
      include: { class: true, major: true },
    });
  }

  async removeClass(assignmentClassId: number) {
    const found = await prisma.assignmentClass.findUnique({ where: { id: assignmentClassId } });
    if (!found) throw new NotFoundException('Pembukaan kelas tidak ditemukan');
    await prisma.assignmentClass.delete({ where: { id: assignmentClassId } });
    return { message: 'Pembukaan kelas dihapus' };
  }

  // ---------------- Pengumpulan (siswa) ----------------
  /** Satu pengumpulan per siswa per tugas; pengumpulan ulang memperbarui yang lama. */
  async submit(
    assignmentId: number,
    studentId: number,
    input: SubmissionInput,
    file?: UploadedFileMeta,
  ) {
    await this.findOne(assignmentId);

    const existing = await prisma.assignmentSubmission.findFirst({
      where: { assignmentId, studentId },
    });

    const fileData = file
      ? {
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: String(file.size),
          fileUrl: `/uploads/assignment-submissions/${file.filename}`,
        }
      : {};

    if (existing) {
      // Cegah penimpaan berkas jika sudah dinilai.
      if (existing.score != null) {
        throw new ForbiddenException('Pengumpulan sudah dinilai dan tidak dapat diubah');
      }
      const updated = await prisma.assignmentSubmission.update({
        where: { id: existing.id },
        data: {
          subject: input.subject?.trim() ?? existing.subject,
          groupMembers: input.groupMembers?.trim() ?? existing.groupMembers,
          notes: input.notes?.trim() ?? existing.notes,
          submittedAt: new Date(),
          ...fileData,
        },
      });
      return { message: 'Pengumpulan diperbarui', submission: updated };
    }

    const created = await prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        studentId,
        subject: input.subject?.trim() || null,
        groupMembers: input.groupMembers?.trim() || null,
        notes: input.notes?.trim() || null,
        ...fileData,
      },
    });
    return { message: 'Tugas berhasil dikumpulkan', submission: created };
  }

  /** Daftar pengumpulan untuk sebuah tugas (guru/admin). */
  async listSubmissions(assignmentId: number) {
    await this.findOne(assignmentId);
    return prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: { student: { include: { user: { select: { id: true, name: true } }, class: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /** Pengumpulan milik siswa untuk sebuah tugas. */
  async mySubmission(assignmentId: number, studentId: number) {
    return prisma.assignmentSubmission.findFirst({ where: { assignmentId, studentId } });
  }

  // ---------------- Penilaian (guru) ----------------
  async grade(submissionId: number, score: number, feedback?: string) {
    const sub = await prisma.assignmentSubmission.findUnique({ where: { id: submissionId } });
    if (!sub) throw new NotFoundException('Pengumpulan tidak ditemukan');
    if (score == null || isNaN(score) || score < 0 || score > 100) {
      throw new BadRequestException('Nilai harus antara 0 dan 100');
    }
    return prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { score, feedback: feedback?.trim() || null },
    });
  }
}
