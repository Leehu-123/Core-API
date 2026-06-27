import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';

@Module({
  imports: [StockMovementsModule],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService, AuditLogService],
})
export class GoodsReceiptsModule {}
