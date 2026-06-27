import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';

@Module({
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService, AuditLogService],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
