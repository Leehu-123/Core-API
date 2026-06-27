import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, AuditLogService],
  exports: [InventoryService],
})
export class InventoryModule {}
