import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { ExamsModule } from './modules/exams/exams.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MasterDataModule,
    MaterialsModule,
    ExamsModule,
  ],
})
export class AppModule {}
