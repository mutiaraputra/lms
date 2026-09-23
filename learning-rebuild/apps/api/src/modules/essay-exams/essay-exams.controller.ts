import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  EssayExamsService,
  EssayExamInput,
  EssayExamClassInput,
} from './essay-exams.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@lms/database';

@Controller('essay-exams')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EssayExamsController {
  constructor(private readonly service: EssayExamsService) {}

  /** Siswa hanya melihat ujian essay yang dibuka untuk kelas/jurusannya; guru/admin melihat semua. */
  @Get()
  getAll(@Request() req: any) {
    if (req.user.role === Role.SISWA) {
      const sp = req.user.studentProfile;
      return this.service.findAll({
        classId: sp?.classId ?? undefined,
        majorId: sp?.majorId ?? undefined,
      });
    }
    return this.service.findAll();
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GURU)
  create(@Body() body: EssayExamInput) {
    return this.service.create(body);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.GURU)
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<EssayExamInput>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.GURU)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ---- Pembukaan kelas ----
  @Post(':id/classes')
  @Roles(Role.ADMIN, Role.GURU)
  addClass(@Param('id', ParseIntPipe) id: number, @Body() body: EssayExamClassInput) {
    return this.service.addClass(id, body);
  }

  @Delete('classes/:classOpeningId')
  @Roles(Role.ADMIN, Role.GURU)
  removeClass(@Param('classOpeningId', ParseIntPipe) classOpeningId: number) {
    return this.service.removeClass(classOpeningId);
  }
}
