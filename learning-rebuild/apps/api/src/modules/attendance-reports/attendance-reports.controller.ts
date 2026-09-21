import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AttendanceReportsService } from './attendance-reports.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@lms/database';

@Controller('attendance-reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AttendanceReportsController {
  constructor(private readonly service: AttendanceReportsService) {}

  private parse(month?: string, year?: string) {
    const m = Number(month);
    const y = Number(year);
    if (!m || !y) throw new BadRequestException('Parameter month & year wajib diisi');
    return { m, y };
  }

  /** Rekap kehadiran (JSON) per bulan/tahun, opsional filter kelas/jurusan. */
  @Get('recap')
  async recap(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('classId') classId?: string,
    @Query('majorId') majorId?: string,
  ) {
    const { m, y } = this.parse(month, year);
    return this.service.recap(m, y, {
      classId: classId ? Number(classId) : undefined,
      majorId: majorId ? Number(majorId) : undefined,
    });
  }

  /** Export rekap sebagai PDF (unduhan). */
  @Get('recap.pdf')
  async recapPdf(
    @Res() res: Response,
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('classId') classId?: string,
    @Query('majorId') majorId?: string,
  ) {
    const { m, y } = this.parse(month, year);
    const pdf = await this.service.recapPdf(m, y, {
      classId: classId ? Number(classId) : undefined,
      majorId: majorId ? Number(majorId) : undefined,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rekap-absensi-${y}-${String(m).padStart(2, '0')}.pdf"`);
    res.send(pdf);
  }
}
