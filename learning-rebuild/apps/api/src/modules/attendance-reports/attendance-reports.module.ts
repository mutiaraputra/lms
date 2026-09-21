import { Module } from '@nestjs/common';
import { AttendanceReportsService } from './attendance-reports.service';
import { AttendanceReportsController } from './attendance-reports.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AttendanceReportsController],
  providers: [AttendanceReportsService],
  exports: [AttendanceReportsService],
})
export class AttendanceReportsModule {}
