import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { getJwtSecret } from '../../config/secrets';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      // Factory dievaluasi saat inisialisasi modul → fail-fast bila
      // JWT_SECRET tidak diset (tanpa fallback hardcoded).
      useFactory: () => ({
        secret: getJwtSecret(),
        // JWT_EXPIRATION mengikuti format `ms` (mis. "7d", "15m"). Cast agar
        // cocok dengan tipe StringValue milik @nestjs/jwt.
        signOptions: { expiresIn: (process.env.JWT_EXPIRATION || '7d') as unknown as number },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailVerificationService, JwtStrategy, RolesGuard],
  exports: [AuthService, EmailVerificationService, JwtStrategy, PassportModule, RolesGuard],
})
export class AuthModule {}
