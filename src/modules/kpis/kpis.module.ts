import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { KpisController } from './kpis.controller';
import { KpisService } from './kpis.service';

@Module({
  controllers: [KpisController],
  providers: [KpisService, AuditLogService],
  exports: [KpisService],
})
export class KpisModule {}
