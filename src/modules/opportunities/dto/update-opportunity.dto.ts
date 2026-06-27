import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateOpportunityDto } from './create-opportunity.dto';

export class UpdateOpportunityDto extends PartialType(CreateOpportunityDto) {
  @ApiPropertyOptional({ example: 'Price too high' })
  @IsOptional()
  @IsString()
  lossReason?: string;

  @ApiPropertyOptional({ example: 'CompetitorX Inc.' })
  @IsOptional()
  @IsString()
  competitor?: string;
}
