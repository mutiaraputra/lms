import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  TeachingAssignmentsService,
  TeachingAssignmentInput,
} from './teaching-assignments.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@lms/database';

@Controller('teaching-assignments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TeachingAssignmentsController {
  constructor(private readonly service: TeachingAssignmentsService) {}

  @Get()
  getAll(
    @Query('teacherId') teacherId?: string,
    @Query('classId') classId?: string,
    @Query('semesterId') semesterId?: string,
  ) {
    return this.service.findAll({
      teacherId: teacherId ? Number(teacherId) : undefined,
      classId: classId ? Number(classId) : undefined,
      semesterId: semesterId ? Number(semesterId) : undefined,
    });
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() body: TeachingAssignmentInput) {
    return this.service.create(body);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() body: TeachingAssignmentInput) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
