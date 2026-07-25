import { Module } from '@nestjs/common';
import { KpiRecordsService } from './kpi-records.service';
import { KpiRecordsController } from './kpi-records.controller';

@Module({
  controllers: [KpiRecordsController],
  providers: [KpiRecordsService],
})
export class KpiRecordsModule {}