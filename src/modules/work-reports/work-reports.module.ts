import { Module } from '@nestjs/common';
import { WorkReportsService } from './work-reports.service';
import { WorkReportsController } from './work-reports.controller';

@Module({
  controllers: [WorkReportsController],
  providers: [WorkReportsService],
})
export class WorkReportsModule {}