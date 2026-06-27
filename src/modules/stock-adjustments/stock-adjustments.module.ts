import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { StockAdjustmentsController } from './stock-adjustments.controller';
import { StockAdjustmentsService } from './stock-adjustments.service';

@Module({
  imports: [StockMovementsModule],
  controllers: [StockAdjustmentsController],
  providers: [StockAdjustmentsService, AuditLogService],
})
export class StockAdjustmentsModule {}
