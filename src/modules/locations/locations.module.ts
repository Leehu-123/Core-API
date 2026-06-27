import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, AuditLogService],
  exports: [LocationsService],
})
export class LocationsModule {}
