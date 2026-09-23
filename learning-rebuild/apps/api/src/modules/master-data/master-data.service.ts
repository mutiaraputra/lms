import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { prisma } from '@lms/database';

@Injectable()
export class MasterDataService {
  // ================================================================
  // READ (dipakai semua role terautentikasi)
  // ================================================================
  async getSchoolSettings() {
    return prisma.schoolSetting.findFirst();
  }

  async getClasses() {
    return prisma.class.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { students: true } }
      }
    });
  }

  async getMajors() {
    return prisma.major.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { students: true } }
      }
    });
  }

  async getSemesters() {
    return prisma.semester.findMany({
      orderBy: { id: 'asc' }
    });
  }

  async getSubjects() {
    return prisma.subject.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async getExamTypes() {
    return prisma.examType.findMany({ orderBy: { id: 'asc' } });
  }

  async getTeachingKitTypes() {
    return prisma.teachingKitType.findMany({ orderBy: { id: 'asc' } });
  }

  async getAssignmentTypes() {
    return prisma.assignmentType.findMany({ orderBy: { id: 'asc' } });
  }

  async getTeachingAssignments() {
    return prisma.teachingAssignment.findMany({
      include: {
        teacher: { include: { user: true } },
        class: true,
        major: true,
        subject: true,
        semester: true
      },
      orderBy: { id: 'asc' }
    });
  }

  // ================================================================
  // WRITE (khusus ADMIN) — Fase 3
  // ================================================================
  private requireName(name?: string): string {
    const clean = (name ?? '').trim();
    if (!clean) throw new BadRequestException('Nama wajib diisi');
    return clean;
  }

  // ---- School settings (single row, upsert) ----
  async upsertSchoolSettings(data: {
    schoolName: string;
    principal?: string;
    logoText?: string;
    logo?: string;
    copyright?: string;
  }) {
    const schoolName = this.requireName(data.schoolName);
    const existing = await prisma.schoolSetting.findFirst();
    const payload = {
      schoolName,
      principal: data.principal?.trim() || null,
      logoText: data.logoText?.trim() || null,
      logo: data.logo?.trim() || null,
      copyright: data.copyright?.trim() || null,
    };
    if (existing) {
      return prisma.schoolSetting.update({ where: { id: existing.id }, data: payload });
    }
    return prisma.schoolSetting.create({ data: payload });
  }

  // ---- Class ----
  async createClass(name: string) {
    const clean = this.requireName(name);
    try {
      return await prisma.class.create({ data: { name: clean } });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('Nama kelas sudah ada');
      throw e;
    }
  }

  async updateClass(id: number, name: string) {
    const clean = this.requireName(name);
    await this.ensureExists(prisma.class.findUnique({ where: { id } }), 'Kelas');
    try {
      return await prisma.class.update({ where: { id }, data: { name: clean } });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('Nama kelas sudah ada');
      throw e;
    }
  }

  async deleteClass(id: number) {
    await this.ensureExists(prisma.class.findUnique({ where: { id } }), 'Kelas');
    try {
      await prisma.class.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new ConflictException('Kelas masih dipakai data lain dan tidak dapat dihapus');
      }
      throw e;
    }
    return { message: 'Kelas dihapus' };
  }

  // ---- Major ----
  async createMajor(name: string) {
    const clean = this.requireName(name);
    try {
      return await prisma.major.create({ data: { name: clean } });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('Nama jurusan sudah ada');
      throw e;
    }
  }

  async updateMajor(id: number, name: string) {
    const clean = this.requireName(name);
    await this.ensureExists(prisma.major.findUnique({ where: { id } }), 'Jurusan');
    try {
      return await prisma.major.update({ where: { id }, data: { name: clean } });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('Nama jurusan sudah ada');
      throw e;
    }
  }

  async deleteMajor(id: number) {
    await this.ensureExists(prisma.major.findUnique({ where: { id } }), 'Jurusan');
    try {
      await prisma.major.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new ConflictException('Jurusan masih dipakai data lain dan tidak dapat dihapus');
      }
      throw e;
    }
    return { message: 'Jurusan dihapus' };
  }

  // ---- Semester ----
  async createSemester(name: string, isActive = true) {
    const clean = this.requireName(name);
    return prisma.semester.create({ data: { name: clean, isActive } });
  }

  async updateSemester(id: number, data: { name?: string; isActive?: boolean }) {
    await this.ensureExists(prisma.semester.findUnique({ where: { id } }), 'Semester');
    const payload: { name?: string; isActive?: boolean } = {};
    if (data.name !== undefined) payload.name = this.requireName(data.name);
    if (data.isActive !== undefined) payload.isActive = data.isActive;
    return prisma.semester.update({ where: { id }, data: payload });
  }

  async deleteSemester(id: number) {
    await this.ensureExists(prisma.semester.findUnique({ where: { id } }), 'Semester');
    try {
      await prisma.semester.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2003') throw new ConflictException('Semester masih dipakai data lain');
      throw e;
    }
    return { message: 'Semester dihapus' };
  }

  // ---- Subject ----
  async createSubject(name: string) {
    const clean = this.requireName(name);
    return prisma.subject.create({ data: { name: clean } });
  }

  async updateSubject(id: number, name: string) {
    const clean = this.requireName(name);
    await this.ensureExists(prisma.subject.findUnique({ where: { id } }), 'Mata pelajaran');
    return prisma.subject.update({ where: { id }, data: { name: clean } });
  }

  async deleteSubject(id: number) {
    await this.ensureExists(prisma.subject.findUnique({ where: { id } }), 'Mata pelajaran');
    try {
      await prisma.subject.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2003') throw new ConflictException('Mata pelajaran masih dipakai data lain');
      throw e;
    }
    return { message: 'Mata pelajaran dihapus' };
  }

  // ---- Generic "type" tables (exam / kit / assignment) ----
  async createType(kind: 'exam' | 'kit' | 'assignment', name: string) {
    const clean = this.requireName(name);
    switch (kind) {
      case 'exam': return prisma.examType.create({ data: { name: clean } });
      case 'kit': return prisma.teachingKitType.create({ data: { name: clean } });
      case 'assignment': return prisma.assignmentType.create({ data: { name: clean } });
    }
  }

  async updateType(kind: 'exam' | 'kit' | 'assignment', id: number, name: string) {
    const clean = this.requireName(name);
    switch (kind) {
      case 'exam':
        await this.ensureExists(prisma.examType.findUnique({ where: { id } }), 'Jenis ujian');
        return prisma.examType.update({ where: { id }, data: { name: clean } });
      case 'kit':
        await this.ensureExists(prisma.teachingKitType.findUnique({ where: { id } }), 'Jenis perangkat');
        return prisma.teachingKitType.update({ where: { id }, data: { name: clean } });
      case 'assignment':
        await this.ensureExists(prisma.assignmentType.findUnique({ where: { id } }), 'Jenis tugas');
        return prisma.assignmentType.update({ where: { id }, data: { name: clean } });
    }
  }

  async deleteType(kind: 'exam' | 'kit' | 'assignment', id: number) {
    try {
      switch (kind) {
        case 'exam':
          await this.ensureExists(prisma.examType.findUnique({ where: { id } }), 'Jenis ujian');
          await prisma.examType.delete({ where: { id } });
          break;
        case 'kit':
          await this.ensureExists(prisma.teachingKitType.findUnique({ where: { id } }), 'Jenis perangkat');
          await prisma.teachingKitType.delete({ where: { id } });
          break;
        case 'assignment':
          await this.ensureExists(prisma.assignmentType.findUnique({ where: { id } }), 'Jenis tugas');
          await prisma.assignmentType.delete({ where: { id } });
          break;
      }
    } catch (e: any) {
      if (e?.code === 'P2003') throw new ConflictException('Jenis ini masih dipakai data lain');
      throw e;
    }
    return { message: 'Data dihapus' };
  }

  // ---- helper ----
  private async ensureExists<T>(promise: Promise<T | null>, label: string): Promise<T> {
    const found = await promise;
    if (!found) throw new NotFoundException(`${label} tidak ditemukan`);
    return found;
  }
}
