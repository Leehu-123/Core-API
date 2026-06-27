import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { SalesTasksController } from './sales-tasks.controller';
import { SalesTasksService } from './sales-tasks.service';

@Module({
  controllers: [SalesTasksController],
  providers: [SalesTasksService, AuditLogService],
  exports: [SalesTasksService],
})
export class SalesTasksModule {}
