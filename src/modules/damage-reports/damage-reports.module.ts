import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { DamageReportsController } from './damage-reports.controller';
import { DamageReportsService } from './damage-reports.service';

@Module({
  imports: [StockMovementsModule],
  controllers: [DamageReportsController],
  providers: [DamageReportsService, AuditLogService],
})
export class DamageReportsModule {}
