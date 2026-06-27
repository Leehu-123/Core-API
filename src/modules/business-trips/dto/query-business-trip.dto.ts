import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryBusinessTripDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['PROPOSED', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['PROPOSED', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
