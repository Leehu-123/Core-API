import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';

@Module({
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService, AuditLogService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}
