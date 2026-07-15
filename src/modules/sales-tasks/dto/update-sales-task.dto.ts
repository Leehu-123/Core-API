import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CreateSalesTaskDto } from './create-sales-task.dto';

export class UpdateSalesTaskDto extends PartialType(CreateSalesTaskDto) {
  @ApiPropertyOptional({
    example: 'DONE',
    enum: ['TODO', 'IN_PROGRESS', 'DONE', 'OVERDUE'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['TODO', 'IN_PROGRESS', 'DONE', 'OVERDUE'])
  status?: string;
}
