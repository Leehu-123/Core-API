import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { ProcessingOrdersController } from './processing-orders.controller';
import { ProcessingOrdersService } from './processing-orders.service';

@Module({
  imports: [StockMovementsModule],
  controllers: [ProcessingOrdersController],
  providers: [ProcessingOrdersService, AuditLogService],
})
export class ProcessingOrdersModule {}
