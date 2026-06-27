import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, AuditLogService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
