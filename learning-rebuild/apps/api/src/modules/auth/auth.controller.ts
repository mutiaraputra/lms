import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { identifier: string; password: string }) {
    return this.authService.login(body.identifier, body.password);
  }

  /**
   * Minta tautan verifikasi/aktivasi akun.
   * Menggantikan alur `kode_unik` lama pada aplikasi absen.
   */
  @Post('request-verification')
  @HttpCode(HttpStatus.OK)
  async requestVerification(@Body() body: { identifier: string }) {
    return this.emailVerificationService.requestVerification(body.identifier);
  }

  /**
   * Konfirmasi verifikasi via token acak (dari tautan email).
   * Menerima token lewat query (?token=...) agar mudah dari tautan email,
   * atau lewat body untuk pemanggilan API.
   */
  @Post('confirm-verification')
  @HttpCode(HttpStatus.OK)
  async confirmVerification(@Body() body: { token?: string }, @Query('token') tokenQuery?: string) {
    return this.emailVerificationService.confirmVerification(body?.token ?? tokenQuery ?? '');
  }

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  async verifyViaLink(@Query('token') token: string) {
    return this.emailVerificationService.confirmVerification(token);
  }
}
