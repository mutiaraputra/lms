import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@lms/database';

/** Umur refresh token (hari). */
const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // ----------------------------------------------------------------
  // Helper refresh token
  // ----------------------------------------------------------------
  /** Simpan refresh token sebagai hash sha256 (opaque, bukan JWT). */
  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /** Terbitkan refresh token baru untuk user; kembalikan nilai mentahnya. */
  private async issueRefreshToken(userId: number): Promise<string> {
    const raw = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { userId, tokenHash: this.hashToken(raw), expiresAt },
    });
    return raw;
  }

  private signAccessToken(user: { id: number; username: string; role: string; name: string }): string {
    return this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });
  }

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
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
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

  /**
   * Tukar refresh token dengan access token baru. Menerapkan ROTASI:
   * token lama dicabut dan token baru diterbitkan (mendeteksi pemakaian ulang).
   */
  async refresh(rawToken: string) {
    if (!rawToken) {
      throw new BadRequestException('Refresh token wajib diisi');
    }

    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: {
        user: {
          include: {
            teacherProfile: true,
            studentProfile: { include: { class: true, major: true } },
          },
        },
      },
    });

    if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token tidak valid atau kedaluwarsa');
    }
    if (!record.user.isActive) {
      throw new UnauthorizedException('Akun tidak aktif');
    }

    // Rotasi: cabut token lama, terbitkan yang baru.
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = this.signAccessToken(record.user);
    const refreshToken = await this.issueRefreshToken(record.user.id);

    return { accessToken, refreshToken };
  }

  /** Cabut satu refresh token (logout perangkat ini). Idempoten. */
  async logout(rawToken: string) {
    if (rawToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Logout berhasil' };
  }
}
