import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateOpportunityDto {
  @ApiProperty({ example: 'Office Renovation Project' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  @IsNotEmpty()
  assignedToId: string;

  @ApiPropertyOptional({ example: 'Tower A Interior' })
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional({ example: 'Glass panels, Aluminum frames' })
  @IsOptional()
  @IsString()
  products?: string;

  @ApiPropertyOptional({ example: 150.5 })
  @IsOptional()
  @IsNumber()
  estimatedArea?: number;

  @ApiPropertyOptional({ example: 500000, default: 0 })
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @ApiPropertyOptional({ example: 50, default: 50, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional({
    example: 'NEW_LEAD',
    enum: ['NEW_LEAD', 'CONTACTED', 'SURVEYED', 'CONSULTING', 'QUOTE_SENT', 'NEGOTIATING', 'CONTRACT_PENDING', 'WON', 'LOST'],
    default: 'NEW_LEAD',
  })
  @IsOptional()
  @IsString()
  @IsIn(['NEW_LEAD', 'CONTACTED', 'SURVEYED', 'CONSULTING', 'QUOTE_SENT', 'NEGOTIATING', 'CONTRACT_PENDING', 'WON', 'LOST'])
  stage?: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @ApiPropertyOptional({ example: 'Initial contact via referral' })
  @IsOptional()
  @IsString()
  notes?: string;
}
