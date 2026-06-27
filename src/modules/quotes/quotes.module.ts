import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { AuditLogService } from '../../common/services';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService, AuditLogService],
  exports: [QuotesService],
})
export class QuotesModule {}
