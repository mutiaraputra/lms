import { Module } from '@nestjs/common';
import { TeachingAssignmentsService } from './teaching-assignments.service';
import { TeachingAssignmentsController } from './teaching-assignments.controller';

@Module({
  controllers: [TeachingAssignmentsController],
  providers: [TeachingAssignmentsService],
  exports: [TeachingAssignmentsService],
})
export class TeachingAssignmentsModule {}
