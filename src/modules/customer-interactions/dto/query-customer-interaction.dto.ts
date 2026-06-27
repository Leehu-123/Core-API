import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryCustomerInteractionDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by interaction type',
    enum: ['CALL', 'MEETING', 'EMAIL', 'VISIT', 'NOTE', 'OTHER'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['CALL', 'MEETING', 'EMAIL', 'VISIT', 'NOTE', 'OTHER'])
  type?: string;
}
