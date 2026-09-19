import { Injectable } from '@nestjs/common';
import { prisma } from '@lms/database';

@Injectable()
export class MasterDataService {
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
}
