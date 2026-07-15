import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { UsersController } from './users.controller';
import { UserLocationsController } from './user-locations.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, UserLocationsController],
  providers: [UsersService, AuditLogService],
  exports: [UsersService],
})
export class UsersModule {}
