import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, AuditLogService],
  exports: [ProductsService],
})
export class ProductsModule {}
