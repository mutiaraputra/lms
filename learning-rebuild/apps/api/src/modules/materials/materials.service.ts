import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@lms/database';

@Injectable()
export class MaterialsService {
  async findAll(classId?: number, majorId?: number) {
    return prisma.material.findMany({
      where: {
        isPublic: true,
        teachingAssignment: {
          classId: classId ? classId : undefined,
          majorId: majorId ? majorId : undefined
        }
      },
      include: {
        teachingAssignment: {
          include: {
            teacher: { include: { user: true } },
            subject: true,
            class: true,
            major: true
          }
        },
        reads: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number) {
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        teachingAssignment: {
          include: {
            teacher: { include: { user: true } },
            subject: true,
            class: true,
            major: true
          }
        },
        reads: {
          include: {
            student: { include: { user: true } }
          }
        }
      }
    });

    if (!material) {
      throw new NotFoundException('Materi pembelajaran tidak ditemukan');
    }

    return material;
  }

  async markAsRead(materialId: number, studentId: number) {
    return prisma.materialRead.upsert({
      where: { id: materialId * 100000 + studentId }, // fallback id or create
      create: {
        materialId,
        studentId,
        readAt: new Date()
      },
      update: {
        readAt: new Date()
      }
    });
  }
}
