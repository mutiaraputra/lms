import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Role } from '@lms/database';

@Injectable()
export class UsersService {
  async getProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        teacherProfile: {
          include: {
            teachingAssignments: {
              include: {
                class: true,
                major: true,
                subject: true,
                semester: true
              }
            }
          }
        },
        studentProfile: {
          include: {
            class: true,
            major: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    return user;
  }

  async findAllUsers(role?: Role) {
    return prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        teacherProfile: true,
        studentProfile: {
          include: {
            class: true,
            major: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });
  }

  async updateStatus(id: number, isActive: boolean) {
    return prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true
      }
    });
  }
}
