import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { TeachingAssignmentsModule } from './modules/teaching-assignments/teaching-assignments.module';
import { EssayExamsModule } from './modules/essay-exams/essay-exams.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { ExamsModule } from './modules/exams/exams.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { AttendanceReportsModule } from './modules/attendance-reports/attendance-reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Rate limiting global (Fase 9 — hardening). Default longgar untuk lalu
    // lintas normal LAN sekolah; endpoint sensitif (login) diperketat via
    // @Throttle di controller. Melindungi dari brute force & abuse.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 menit
        limit: 120, // 120 permintaan/menit/IP untuk endpoint umum
      },
    ]),
    AuthModule,
    UsersModule,
    MasterDataModule,
    TeachingAssignmentsModule,
    EssayExamsModule,
    AssignmentsModule,
    ReportsModule,
    MaterialsModule,
    ExamsModule,
    AttendanceModule,
    LeaveRequestsModule,
    AttendanceReportsModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [
    // Aktifkan ThrottlerGuard secara global.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
