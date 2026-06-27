import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { CustomerInteractionsController } from './customer-interactions.controller';
import { CustomerInteractionsService } from './customer-interactions.service';

@Module({
  controllers: [CustomerInteractionsController],
  providers: [CustomerInteractionsService, AuditLogService],
  exports: [CustomerInteractionsService],
})
export class CustomerInteractionsModule {}
