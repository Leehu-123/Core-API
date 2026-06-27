import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, AuditLogService],
  exports: [CustomersService],
})
export class CustomersModule {}
