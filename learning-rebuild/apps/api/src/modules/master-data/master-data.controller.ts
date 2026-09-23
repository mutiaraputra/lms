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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MasterDataService } from './master-data.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@lms/database';

@Controller('master')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  // ---------------- READ (semua role) ----------------
  @Get('school')
  getSchoolSettings() {
    return this.masterDataService.getSchoolSettings();
  }

  @Get('classes')
  getClasses() {
    return this.masterDataService.getClasses();
  }

  @Get('majors')
  getMajors() {
    return this.masterDataService.getMajors();
  }

  @Get('semesters')
  getSemesters() {
    return this.masterDataService.getSemesters();
  }

  @Get('subjects')
  getSubjects() {
    return this.masterDataService.getSubjects();
  }

  @Get('exam-types')
  getExamTypes() {
    return this.masterDataService.getExamTypes();
  }

  @Get('kit-types')
  getKitTypes() {
    return this.masterDataService.getTeachingKitTypes();
  }

  @Get('assignment-types')
  getAssignmentTypes() {
    return this.masterDataService.getAssignmentTypes();
  }

  @Get('teaching-assignments')
  getTeachingAssignments() {
    return this.masterDataService.getTeachingAssignments();
  }

  // ---------------- WRITE (khusus ADMIN) — Fase 3 ----------------
  @Put('school')
  @Roles(Role.ADMIN)
  upsertSchool(
    @Body() body: { schoolName: string; principal?: string; logoText?: string; logo?: string; copyright?: string },
  ) {
    return this.masterDataService.upsertSchoolSettings(body);
  }

  // Classes
  @Post('classes')
  @Roles(Role.ADMIN)
  createClass(@Body('name') name: string) {
    return this.masterDataService.createClass(name);
  }

  @Put('classes/:id')
  @Roles(Role.ADMIN)
  updateClass(@Param('id', ParseIntPipe) id: number, @Body('name') name: string) {
    return this.masterDataService.updateClass(id, name);
  }

  @Delete('classes/:id')
  @Roles(Role.ADMIN)
  deleteClass(@Param('id', ParseIntPipe) id: number) {
    return this.masterDataService.deleteClass(id);
  }

  // Majors
  @Post('majors')
  @Roles(Role.ADMIN)
  createMajor(@Body('name') name: string) {
    return this.masterDataService.createMajor(name);
  }

  @Put('majors/:id')
  @Roles(Role.ADMIN)
  updateMajor(@Param('id', ParseIntPipe) id: number, @Body('name') name: string) {
    return this.masterDataService.updateMajor(id, name);
  }

  @Delete('majors/:id')
  @Roles(Role.ADMIN)
  deleteMajor(@Param('id', ParseIntPipe) id: number) {
    return this.masterDataService.deleteMajor(id);
  }

  // Semesters
  @Post('semesters')
  @Roles(Role.ADMIN)
  createSemester(@Body() body: { name: string; isActive?: boolean }) {
    return this.masterDataService.createSemester(body.name, body.isActive ?? true);
  }

  @Put('semesters/:id')
  @Roles(Role.ADMIN)
  updateSemester(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.masterDataService.updateSemester(id, body);
  }

  @Delete('semesters/:id')
  @Roles(Role.ADMIN)
  deleteSemester(@Param('id', ParseIntPipe) id: number) {
    return this.masterDataService.deleteSemester(id);
  }

  // Subjects
  @Post('subjects')
  @Roles(Role.ADMIN)
  createSubject(@Body('name') name: string) {
    return this.masterDataService.createSubject(name);
  }

  @Put('subjects/:id')
  @Roles(Role.ADMIN)
  updateSubject(@Param('id', ParseIntPipe) id: number, @Body('name') name: string) {
    return this.masterDataService.updateSubject(id, name);
  }

  @Delete('subjects/:id')
  @Roles(Role.ADMIN)
  deleteSubject(@Param('id', ParseIntPipe) id: number) {
    return this.masterDataService.deleteSubject(id);
  }

  // Exam types
  @Post('exam-types')
  @Roles(Role.ADMIN)
  createExamType(@Body('name') name: string) {
    return this.masterDataService.createType('exam', name);
  }

  @Put('exam-types/:id')
  @Roles(Role.ADMIN)
  updateExamType(@Param('id', ParseIntPipe) id: number, @Body('name') name: string) {
    return this.masterDataService.updateType('exam', id, name);
  }

  @Delete('exam-types/:id')
  @Roles(Role.ADMIN)
  deleteExamType(@Param('id', ParseIntPipe) id: number) {
    return this.masterDataService.deleteType('exam', id);
  }

  // Kit types
  @Post('kit-types')
  @Roles(Role.ADMIN)
  createKitType(@Body('name') name: string) {
    return this.masterDataService.createType('kit', name);
  }

  @Put('kit-types/:id')
  @Roles(Role.ADMIN)
  updateKitType(@Param('id', ParseIntPipe) id: number, @Body('name') name: string) {
    return this.masterDataService.updateType('kit', id, name);
  }

  @Delete('kit-types/:id')
  @Roles(Role.ADMIN)
  deleteKitType(@Param('id', ParseIntPipe) id: number) {
    return this.masterDataService.deleteType('kit', id);
  }

  // Assignment types
  @Post('assignment-types')
  @Roles(Role.ADMIN)
  createAssignmentType(@Body('name') name: string) {
    return this.masterDataService.createType('assignment', name);
  }

  @Put('assignment-types/:id')
  @Roles(Role.ADMIN)
  updateAssignmentType(@Param('id', ParseIntPipe) id: number, @Body('name') name: string) {
    return this.masterDataService.updateType('assignment', id, name);
  }

  @Delete('assignment-types/:id')
  @Roles(Role.ADMIN)
  deleteAssignmentType(@Param('id', ParseIntPipe) id: number) {
    return this.masterDataService.deleteType('assignment', id);
  }
}
