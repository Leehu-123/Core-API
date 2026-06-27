import { PartialType } from '@nestjs/swagger';
import { CreateSalesTaskDto } from './create-sales-task.dto';

export class UpdateSalesTaskDto extends PartialType(CreateSalesTaskDto) {}
