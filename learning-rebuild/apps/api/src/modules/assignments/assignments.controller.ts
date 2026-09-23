import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import {
  AssignmentsService,
  AssignmentInput,
  AssignmentClassInput,
  UploadedFileMeta,
} from './assignments.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@lms/database';

const UPLOADS_ROOT = process.env.UPLOADS_DIR || 'uploads';
const SUBMISSION_DIR = `${UPLOADS_ROOT}/assignment-submissions`;
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.ppt', '.pptx', '.xls', '.xlsx'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

@Controller('assignments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

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
  create(@Body() body: AssignmentInput) {
    return this.service.create(body);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.GURU)
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<AssignmentInput>) {
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
  addClass(@Param('id', ParseIntPipe) id: number, @Body() body: AssignmentClassInput) {
    return this.service.addClass(id, body);
  }

  @Delete('classes/:classOpeningId')
  @Roles(Role.ADMIN, Role.GURU)
  removeClass(@Param('classOpeningId', ParseIntPipe) classOpeningId: number) {
    return this.service.removeClass(classOpeningId);
  }

  // ---- Pengumpulan (siswa) ----
  @Post(':id/submit')
  @Roles(Role.SISWA)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(SUBMISSION_DIR, { recursive: true });
          cb(null, SUBMISSION_DIR);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXT.includes(ext)) {
          return cb(new BadRequestException(`Ekstensi tidak diizinkan (${ALLOWED_EXT.join(', ')})`), false);
        }
        cb(null, true);
      },
    }),
  )
  submit(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() body: { subject?: string; groupMembers?: string; notes?: string },
    @UploadedFile() file?: UploadedFileMeta,
  ) {
    const sp = req.user.studentProfile;
    if (!sp) throw new ForbiddenException('Hanya siswa yang dapat mengumpulkan tugas');
    return this.service.submit(id, sp.id, body, file);
  }

  @Get(':id/my-submission')
  @Roles(Role.SISWA)
  mySubmission(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const sp = req.user.studentProfile;
    if (!sp) throw new ForbiddenException('Hanya siswa yang memiliki pengumpulan');
    return this.service.mySubmission(id, sp.id);
  }

  // ---- Daftar & penilaian (guru/admin) ----
  @Get(':id/submissions')
  @Roles(Role.ADMIN, Role.GURU)
  listSubmissions(@Param('id', ParseIntPipe) id: number) {
    return this.service.listSubmissions(id);
  }

  @Patch('submissions/:submissionId/grade')
  @Roles(Role.ADMIN, Role.GURU)
  grade(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Body() body: { score: number; feedback?: string },
  ) {
    return this.service.grade(submissionId, body.score, body.feedback);
  }
}
