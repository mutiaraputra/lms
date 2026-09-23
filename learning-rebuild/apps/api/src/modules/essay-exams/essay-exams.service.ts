import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { prisma } from '@lms/database';

export interface EssayExamInput {
  title: string;
  examDate: string;          // ISO date
  essayContent: string;      // soal essay (satu blok teks)
  totalQuestions?: number;
  examTypeId: number;
  teacherId: number;
  subjectId: number;
  semesterId: number;
}

export interface EssayExamClassInput {
  classId: number;
  majorId: number;
  isActive?: boolean;
}

/**
 * Modul Essay Exams (Fase 6a). Menyediakan CRUD ujian essay + pengelolaan
 * kelas yang dibuka. Data historis (`ujian_essay`, `kelas_ujianessay`) sudah
 * dimigrasi via ETL ke model EssayExam/EssayExamClass.
 *
 * Catatan: schema saat ini menyimpan soal essay sebagai satu kolom teks
 * (`essayContent`) dan BELUM memiliki tabel pengumpulan/penilaian jawaban
 * essay per siswa. Penilaian manual per-siswa memerlukan penambahan model
 * (mis. EssayExamSubmission) — di luar cakupan modul ini dan ditandai sebagai
 * pekerjaan lanjutan agar tidak memalsukan fitur.
 */
@Injectable()
export class EssayExamsService {
  private readonly include = {
    examType: true,
    teacher: { include: { user: { select: { id: true, name: true } } } },
    subject: true,
    semester: true,
    classes: { include: { class: true, major: true } },
  };

  async findAll(filter: { classId?: number; majorId?: number } = {}) {
    const where: any = {};
    if (filter.classId && filter.majorId) {
      where.classes = { some: { classId: filter.classId, majorId: filter.majorId, isActive: true } };
    }
    return prisma.essayExam.findMany({
      where,
      include: this.include,
      orderBy: { examDate: 'desc' },
    });
  }

  async findOne(id: number) {
    const exam = await prisma.essayExam.findUnique({ where: { id }, include: this.include });
    if (!exam) throw new NotFoundException('Ujian essay tidak ditemukan');
    return exam;
  }

  private parseDate(value: string): Date {
    const d = new Date(value);
    if (isNaN(d.getTime())) throw new BadRequestException('Tanggal ujian tidak valid');
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private async validateRefs(input: EssayExamInput) {
    const [examType, teacher, subject, semester] = await Promise.all([
      prisma.examType.findUnique({ where: { id: input.examTypeId } }),
      prisma.teacherProfile.findUnique({ where: { id: input.teacherId } }),
      prisma.subject.findUnique({ where: { id: input.subjectId } }),
      prisma.semester.findUnique({ where: { id: input.semesterId } }),
    ]);
    if (!examType) throw new BadRequestException('Jenis ujian (examTypeId) tidak ditemukan');
    if (!teacher) throw new BadRequestException('Guru (teacherId) tidak ditemukan');
    if (!subject) throw new BadRequestException('Mata pelajaran (subjectId) tidak ditemukan');
    if (!semester) throw new BadRequestException('Semester (semesterId) tidak ditemukan');
  }

  async create(input: EssayExamInput) {
    const title = (input.title ?? '').trim();
    const essayContent = (input.essayContent ?? '').trim();
    if (!title) throw new BadRequestException('Judul ujian wajib diisi');
    if (!essayContent) throw new BadRequestException('Isi soal essay wajib diisi');
    if (!input.examTypeId || !input.teacherId || !input.subjectId || !input.semesterId) {
      throw new BadRequestException('examTypeId, teacherId, subjectId, semesterId wajib diisi');
    }
    await this.validateRefs(input);

    return prisma.essayExam.create({
      data: {
        title,
        essayContent,
        examDate: this.parseDate(input.examDate),
        totalQuestions: input.totalQuestions ?? 0,
        examTypeId: input.examTypeId,
        teacherId: input.teacherId,
        subjectId: input.subjectId,
        semesterId: input.semesterId,
      },
      include: this.include,
    });
  }

  async update(id: number, input: Partial<EssayExamInput>) {
    await this.findOne(id);
    const data: any = {};
    if (input.title !== undefined) {
      const t = input.title.trim();
      if (!t) throw new BadRequestException('Judul tidak boleh kosong');
      data.title = t;
    }
    if (input.essayContent !== undefined) {
      const c = input.essayContent.trim();
      if (!c) throw new BadRequestException('Isi soal essay tidak boleh kosong');
      data.essayContent = c;
    }
    if (input.examDate !== undefined) data.examDate = this.parseDate(input.examDate);
    if (input.totalQuestions !== undefined) data.totalQuestions = input.totalQuestions;
    if (input.examTypeId !== undefined) data.examTypeId = input.examTypeId;
    if (input.teacherId !== undefined) data.teacherId = input.teacherId;
    if (input.subjectId !== undefined) data.subjectId = input.subjectId;
    if (input.semesterId !== undefined) data.semesterId = input.semesterId;

    return prisma.essayExam.update({ where: { id }, data, include: this.include });
  }

  async remove(id: number) {
    await this.findOne(id);
    await prisma.essayExam.delete({ where: { id } });
    return { message: 'Ujian essay dihapus' };
  }

  // ---- Kelas yang dibuka untuk ujian essay ----
  async addClass(essayExamId: number, input: EssayExamClassInput) {
    await this.findOne(essayExamId);
    const [klass, major] = await Promise.all([
      prisma.class.findUnique({ where: { id: input.classId } }),
      prisma.major.findUnique({ where: { id: input.majorId } }),
    ]);
    if (!klass) throw new BadRequestException('Kelas tidak ditemukan');
    if (!major) throw new BadRequestException('Jurusan tidak ditemukan');

    return prisma.essayExamClass.upsert({
      where: {
        essayExamId_classId_majorId: {
          essayExamId,
          classId: input.classId,
          majorId: input.majorId,
        },
      },
      create: {
        essayExamId,
        classId: input.classId,
        majorId: input.majorId,
        isActive: input.isActive ?? true,
      },
      update: { isActive: input.isActive ?? true },
      include: { class: true, major: true },
    });
  }

  async removeClass(essayExamClassId: number) {
    const found = await prisma.essayExamClass.findUnique({ where: { id: essayExamClassId } });
    if (!found) throw new NotFoundException('Pembukaan kelas tidak ditemukan');
    await prisma.essayExamClass.delete({ where: { id: essayExamClassId } });
    return { message: 'Pembukaan kelas dihapus' };
  }
}
