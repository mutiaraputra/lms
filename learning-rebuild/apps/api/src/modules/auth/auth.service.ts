import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@lms/database';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(identifier: string, passwordPlain: string) {
    if (!identifier || !passwordPlain) {
      throw new BadRequestException('Identifier dan password wajib diisi');
    }

    const cleanIdentifier = identifier.trim();

    // 1. Cari user berdasarkan email, username, NIS siswa, atau NIK guru
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanIdentifier },
          { username: `siswa_${cleanIdentifier}` },
          { username: `guru_${cleanIdentifier}` },
          { email: cleanIdentifier.toLowerCase() },
          { studentProfile: { nis: cleanIdentifier } },
          { teacherProfile: { nik: cleanIdentifier } }
        ]
      },
      include: {
        teacherProfile: true,
        studentProfile: {
          include: {
            class: true,
            major: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException('Kredensial login tidak valid');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Akun belum diaktifkan atau dinonaktifkan oleh administrator');
    }

    // 2. Verifikasi Password (Transisi Legacy SHA1 -> Bcrypt)
    let passwordValid = false;

    if (user.passwordHash) {
      // User sudah menggunakan password hash modern
      passwordValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    } else if (user.legacyPasswordSha1) {
      // User lama dengan SHA1 tanpa salt
      const sha1Input = crypto.createHash('sha1').update(passwordPlain).digest('hex');
      if (sha1Input.toLowerCase() === user.legacyPasswordSha1.toLowerCase()) {
        passwordValid = true;

        // Otomatis upgrade ke bcrypt dan hapus legacy password
        const modernHash = await bcrypt.hash(passwordPlain, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: modernHash,
            legacyPasswordSha1: null
          }
        });
      }
    }

    if (!passwordValid) {
      throw new UnauthorizedException('Kredensial login tidak valid');
    }

    // 3. Generate JWT Token
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        teacherProfile: user.teacherProfile,
        studentProfile: user.studentProfile
      }
    };
  }
}
