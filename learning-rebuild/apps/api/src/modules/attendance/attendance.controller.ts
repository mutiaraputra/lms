import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AttendanceService } from './attendance.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, AttendanceType } from '@lms/database';

@Controller('attendance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /** QR milik sendiri untuk ditunjukkan ke pemindai operator. */
  @Get('my-qr')
  async myQr(@Request() req: any) {
    return this.attendanceService.issueQrPayload(req.user.id);
  }

  /** Operator/Admin dapat menerbitkan QR untuk user tertentu (mis. cetak kartu). */
  @Get('qr/:userId')
  @Roles(Role.ADMIN)
  async qrFor(@Param('userId', ParseIntPipe) userId: number) {
    return this.attendanceService.issueQrPayload(userId);
  }

  /**
   * Endpoint pemindaian. Hanya ADMIN/operator yang menjalankan sesi scan
   * (kamera pemindai di gerbang/kelas). Mengirim payload QR + jenis absen.
   */
  @Post('scan')
  @Roles(Role.ADMIN)
  async scan(@Body() body: { qr: string; type: string }) {
    const type = String(body?.type || '').toUpperCase();
    if (!body?.qr) throw new BadRequestException('Payload QR wajib diisi');
    if (type !== AttendanceType.MASUK && type !== AttendanceType.KELUAR) {
      throw new BadRequestException('type harus MASUK atau KELUAR');
    }
    return this.attendanceService.scan(body.qr, type as AttendanceType);
  }

  /** Riwayat kehadiran milik sendiri. */
  @Get('my-history')
  async myHistory(@Request() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.attendanceService.history(req.user.id, { from, to });
  }

  /** Daftar kehadiran harian (operator/admin). */
  @Get('daily')
  @Roles(Role.ADMIN)
  async daily(@Query('date') date: string, @Query('classId') classId?: string) {
    return this.attendanceService.dailyList(date, classId ? Number(classId) : undefined);
  }
}
