import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MasterDataService } from './master-data.service';

@Controller('master')
@UseGuards(AuthGuard('jwt'))
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

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

  @Get('teaching-assignments')
  getTeachingAssignments() {
    return this.masterDataService.getTeachingAssignments();
  }
}
