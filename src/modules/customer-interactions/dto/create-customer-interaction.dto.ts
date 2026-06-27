import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCustomerInteractionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    example: 'CALL',
    enum: ['CALL', 'MEETING', 'EMAIL', 'VISIT', 'NOTE', 'OTHER'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['CALL', 'MEETING', 'EMAIL', 'VISIT', 'NOTE', 'OTHER'])
  type: string;

  @ApiProperty({ example: 'Discussed pricing for Q3 order' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'Customer agreed to schedule a follow-up meeting' })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional({ example: '2026-08-01T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;
}
