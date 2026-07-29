import { Module } from '@nestjs/common';
import { CronsService } from './crons.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CronsService],
})
export class CronsModule {}
