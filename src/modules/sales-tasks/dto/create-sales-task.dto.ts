import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSalesTaskDto {
  @ApiProperty({ example: 'Follow up on quotation' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'CALL',
    enum: ['CALL', 'ZALO', 'EMAIL', 'MEETING', 'SITE_SURVEY', 'SEND_QUOTE', 'FOLLOW_QUOTE', 'FOLLOW_PAYMENT', 'FOLLOW_UP', 'OTHER'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['CALL', 'ZALO', 'EMAIL', 'MEETING', 'SITE_SURVEY', 'SEND_QUOTE', 'FOLLOW_QUOTE', 'FOLLOW_PAYMENT', 'FOLLOW_UP', 'OTHER'])
  type: string;

  @ApiPropertyOptional({
    example: 'TODO',
    enum: ['TODO', 'IN_PROGRESS', 'DONE', 'OVERDUE'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['TODO', 'IN_PROGRESS', 'DONE', 'OVERDUE'])
  status?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  assignedToId: string;

  @ApiProperty({ example: '2026-07-15T10:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @ApiPropertyOptional({
    example: 'MEDIUM',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM',
  })
  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ example: 'Discuss pricing for bulk order' })
  @IsOptional()
  @IsString()
  notes?: string;
}
