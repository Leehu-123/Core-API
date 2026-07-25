import { Module } from '@nestjs/common';
import { KpiCriteriaService } from './kpi-criteria.service';
import { KpiCriteriaController } from './kpi-criteria.controller';

@Module({
  controllers: [KpiCriteriaController],
  providers: [KpiCriteriaService],
})
export class KpiCriteriaModule {}