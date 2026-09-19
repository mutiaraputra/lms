import { Controller, Get, Post, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MaterialsService } from './materials.service';

@Controller('materials')
@UseGuards(AuthGuard('jwt'))
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  async getAll(@Request() req: any) {
    const studentProfile = req.user.studentProfile;
    return this.materialsService.findAll(
      studentProfile?.classId ?? undefined,
      studentProfile?.majorId ?? undefined
    );
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.materialsService.findOne(id);
  }

  @Post(':id/read')
  async markRead(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const studentProfile = req.user.studentProfile;
    if (!studentProfile) {
      return { message: 'Hanya akun siswa yang dapat mencatat baca materi' };
    }
    return this.materialsService.markAsRead(id, studentProfile.id);
  }
}
