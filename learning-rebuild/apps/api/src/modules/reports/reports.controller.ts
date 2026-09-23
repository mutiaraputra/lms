import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@lms/database';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.GURU)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  // ---- Ujian objektif ----
  @Get('exams/:id/recap')
  examRecap(@Param('id', ParseIntPipe) id: number) {
    return this.service.examRecap(id);
  }

  @Get('exams/:id/recap.pdf')
  async examRecapPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const pdf = await this.service.examRecapPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rekap-nilai-ujian-${id}.pdf"`);
    res.send(pdf);
  }

  // ---- Tugas ----
  @Get('assignments/:id/recap')
  assignmentRecap(@Param('id', ParseIntPipe) id: number) {
    return this.service.assignmentRecap(id);
  }

  @Get('assignments/:id/recap.pdf')
  async assignmentRecapPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const pdf = await this.service.assignmentRecapPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rekap-nilai-tugas-${id}.pdf"`);
    res.send(pdf);
  }
}
