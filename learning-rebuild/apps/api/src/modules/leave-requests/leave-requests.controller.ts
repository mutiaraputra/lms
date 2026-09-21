import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import {
  LeaveRequestsService,
  UploadedProof,
} from './leave-requests.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@lms/database';

const PROOF_DIR = 'uploads/leave-proofs';
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

@Controller('leave-requests')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeaveRequestsController {
  constructor(private readonly service: LeaveRequestsService) {}

  /** Ajukan izin (siswa & guru) dengan unggah bukti opsional (jpg/jpeg/png ≤ 2MB). */
  @Post()
  @UseInterceptors(
    FileInterceptor('proof', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(PROOF_DIR, { recursive: true });
          cb(null, PROOF_DIR);
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
          return cb(new BadRequestException('Bukti harus berformat jpg, jpeg, atau png'), false);
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @Request() req: any,
    @Body() body: { type: string; reason?: string; leaveDate: string },
    @UploadedFile() proof?: UploadedProof,
  ) {
    return this.service.create(req.user.id, body, proof);
  }

  /** Riwayat izin milik sendiri. */
  @Get('mine')
  async mine(@Request() req: any) {
    return this.service.listMine(req.user.id);
  }

  /** Daftar semua ajuan (admin), opsional ?status=MENUNGGU|DITERIMA|DITOLAK. */
  @Get()
  @Roles(Role.ADMIN)
  async all(@Query('status') status?: string) {
    return this.service.listAll(status);
  }

  @Get(':id')
  async one(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.getOne(id, { id: req.user.id, role: req.user.role });
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  async approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.approve(id, { id: req.user.id, name: req.user.name });
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN)
  async reject(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.reject(id, { id: req.user.id, name: req.user.name });
  }
}
