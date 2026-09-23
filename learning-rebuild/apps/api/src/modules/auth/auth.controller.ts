import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import {
  LoginDto,
  RefreshTokenDto,
  RequestVerificationDto,
  ConfirmVerificationDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  // Perketat login: maks 10 percobaan / menit / IP (anti brute force).
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.identifier, body.password);
  }

  /** Tukar refresh token dengan access token baru (dengan rotasi). */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refreshToken);
  }

  /** Cabut refresh token (logout perangkat ini). */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: RefreshTokenDto) {
    return this.authService.logout(body.refreshToken);
  }

  /**
   * Minta tautan verifikasi/aktivasi akun.
   * Menggantikan alur `kode_unik` lama pada aplikasi absen.
   */
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('request-verification')
  @HttpCode(HttpStatus.OK)
  async requestVerification(@Body() body: RequestVerificationDto) {
    return this.emailVerificationService.requestVerification(body.identifier);
  }

  /**
   * Konfirmasi verifikasi via token acak (dari tautan email).
   * Menerima token lewat query (?token=...) agar mudah dari tautan email,
   * atau lewat body untuk pemanggilan API.
   */
  @Post('confirm-verification')
  @HttpCode(HttpStatus.OK)
  async confirmVerification(@Body() body: ConfirmVerificationDto, @Query('token') tokenQuery?: string) {
    return this.emailVerificationService.confirmVerification(body?.token ?? tokenQuery ?? '');
  }

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  async verifyViaLink(@Query('token') token: string) {
    return this.emailVerificationService.confirmVerification(token);
  }
}
