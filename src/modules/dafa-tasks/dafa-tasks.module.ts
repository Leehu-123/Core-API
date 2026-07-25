import { Module } from '@nestjs/common';
import { DafaTasksService } from './dafa-tasks.service';
import { DafaTasksController } from './dafa-tasks.controller';

@Module({
  controllers: [DafaTasksController],
  providers: [DafaTasksService],
})
export class DafaTasksModule {}