import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { BusinessTripsController } from './business-trips.controller';
import { BusinessTripsService } from './business-trips.service';

@Module({
  controllers: [BusinessTripsController],
  providers: [BusinessTripsService, AuditLogService],
  exports: [BusinessTripsService],
})
export class BusinessTripsModule {}
