import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { ExamsModule } from './modules/exams/exams.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { AttendanceReportsModule } from './modules/attendance-reports/attendance-reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MasterDataModule,
    MaterialsModule,
    ExamsModule,
    AttendanceModule,
    LeaveRequestsModule,
    AttendanceReportsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
