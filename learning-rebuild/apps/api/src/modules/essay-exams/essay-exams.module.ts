import { Module } from '@nestjs/common';
import { EssayExamsService } from './essay-exams.service';
import { EssayExamsController } from './essay-exams.controller';

@Module({
  controllers: [EssayExamsController],
  providers: [EssayExamsService],
  exports: [EssayExamsService],
})
export class EssayExamsModule {}
