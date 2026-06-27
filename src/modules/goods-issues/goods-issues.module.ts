import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { GoodsIssuesController } from './goods-issues.controller';
import { GoodsIssuesService } from './goods-issues.service';

@Module({
  imports: [StockMovementsModule],
  controllers: [GoodsIssuesController],
  providers: [GoodsIssuesService, AuditLogService],
})
export class GoodsIssuesModule {}
