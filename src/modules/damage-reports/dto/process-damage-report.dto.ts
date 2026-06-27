import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProcessDamageReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  handlingPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
