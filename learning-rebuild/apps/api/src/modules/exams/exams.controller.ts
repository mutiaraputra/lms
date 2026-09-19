import { Controller, Get, Post, Param, Body, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExamsService } from './exams.service';
import { Role } from '@lms/database';

@Controller('exams')
@UseGuards(AuthGuard('jwt'))
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  async getAll(@Request() req: any) {
    const studentProfile = req.user.studentProfile;
    return this.examsService.findAll(
      studentProfile?.classId ?? undefined,
      studentProfile?.majorId ?? undefined
    );
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const isStudent = req.user.role === Role.SISWA;
    return this.examsService.findOne(id, isStudent);
  }

  @Post(':id/submit')
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @Body('answers') answers: Array<{ questionId: number; selectedOption: number }>,
    @Request() req: any
  ) {
    const studentProfile = req.user.studentProfile;
    if (!studentProfile) {
      return { message: 'Hanya akun siswa yang dapat mengerjakan ujian' };
    }
    return this.examsService.submitExam(id, studentProfile.id, answers || []);
  }
}
