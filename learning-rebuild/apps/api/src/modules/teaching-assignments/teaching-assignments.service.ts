import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { prisma } from '@lms/database';

export interface TeachingAssignmentInput {
  teacherId: number;
  classId: number;
  subjectId: number;
  semesterId: number;
  majorId: number;
}

/**
 * Modul Teaching Assignments (Fase 3) — mengelola pivot penugasan mengajar
 * (`tb_roleguru` lama): guru → kelas + mapel + semester + jurusan.
 * Data historis sudah dimigrasi via ETL; modul ini menyediakan CRUD tulis
 * (khusus ADMIN) + baca yang lebih kaya, termasuk filter per guru.
 */
@Injectable()
export class TeachingAssignmentsService {
  private readonly include = {
    teacher: { include: { user: { select: { id: true, name: true } } } },
    class: true,
    major: true,
    subject: true,
    semester: true,
  };

  async findAll(filter: { teacherId?: number; classId?: number; semesterId?: number } = {}) {
    const where: any = {};
    if (filter.teacherId) where.teacherId = filter.teacherId;
    if (filter.classId) where.classId = filter.classId;
    if (filter.semesterId) where.semesterId = filter.semesterId;
    return prisma.teachingAssignment.findMany({
      where,
      include: this.include,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const found = await prisma.teachingAssignment.findUnique({
      where: { id },
      include: this.include,
    });
    if (!found) throw new NotFoundException('Penugasan mengajar tidak ditemukan');
    return found;
  }

  private async validateRefs(input: TeachingAssignmentInput) {
    const [teacher, klass, subject, semester, major] = await Promise.all([
      prisma.teacherProfile.findUnique({ where: { id: input.teacherId } }),
      prisma.class.findUnique({ where: { id: input.classId } }),
      prisma.subject.findUnique({ where: { id: input.subjectId } }),
      prisma.semester.findUnique({ where: { id: input.semesterId } }),
      prisma.major.findUnique({ where: { id: input.majorId } }),
    ]);
    if (!teacher) throw new BadRequestException('Guru (teacherId) tidak ditemukan');
    if (!klass) throw new BadRequestException('Kelas (classId) tidak ditemukan');
    if (!subject) throw new BadRequestException('Mata pelajaran (subjectId) tidak ditemukan');
    if (!semester) throw new BadRequestException('Semester (semesterId) tidak ditemukan');
    if (!major) throw new BadRequestException('Jurusan (majorId) tidak ditemukan');
  }

  private assertComplete(input: Partial<TeachingAssignmentInput>): asserts input is TeachingAssignmentInput {
    const missing = ['teacherId', 'classId', 'subjectId', 'semesterId', 'majorId'].filter(
      (k) => !(input as any)[k],
    );
    if (missing.length) {
      throw new BadRequestException(`Field wajib belum lengkap: ${missing.join(', ')}`);
    }
  }

  async create(input: TeachingAssignmentInput) {
    this.assertComplete(input);
    await this.validateRefs(input);
    try {
      return await prisma.teachingAssignment.create({
        data: {
          teacherId: input.teacherId,
          classId: input.classId,
          subjectId: input.subjectId,
          semesterId: input.semesterId,
          majorId: input.majorId,
        },
        include: this.include,
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Penugasan dengan kombinasi guru/kelas/mapel/semester/jurusan ini sudah ada');
      }
      throw e;
    }
  }

  async update(id: number, input: TeachingAssignmentInput) {
    await this.findOne(id);
    this.assertComplete(input);
    await this.validateRefs(input);
    try {
      return await prisma.teachingAssignment.update({
        where: { id },
        data: {
          teacherId: input.teacherId,
          classId: input.classId,
          subjectId: input.subjectId,
          semesterId: input.semesterId,
          majorId: input.majorId,
        },
        include: this.include,
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Kombinasi penugasan ini sudah ada');
      }
      throw e;
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      await prisma.teachingAssignment.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new ConflictException('Penugasan masih memiliki materi/perangkat terkait dan tidak dapat dihapus');
      }
      throw e;
    }
    return { message: 'Penugasan mengajar dihapus' };
  }
}
