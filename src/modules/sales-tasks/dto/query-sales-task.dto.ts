import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QuerySalesTaskDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'Filter by task type',
    enum: ['CALL', 'MEETING', 'EMAIL', 'VISIT', 'FOLLOW_UP', 'OTHER'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['CALL', 'MEETING', 'EMAIL', 'VISIT', 'FOLLOW_UP', 'OTHER'])
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filter tasks due on or after this date', example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter tasks due on or before this date', example: '2026-07-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;
}
