import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { prisma } from '@lms/database';
import { getJwtSecret } from '../../config/secrets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: { sub: number; username: string; role: string }) {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
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

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Akun tidak aktif atau tidak ditemukan');
    }

    return user;
  }
}
