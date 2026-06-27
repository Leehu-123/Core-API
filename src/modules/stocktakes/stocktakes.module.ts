import { Module } from '@nestjs/common';
import { AuditLogService } from '../../common/services';
import { StocktakesController } from './stocktakes.controller';
import { StocktakesService } from './stocktakes.service';

@Module({
  controllers: [StocktakesController],
  providers: [StocktakesService, AuditLogService],
})
export class StocktakesModule {}
