import { PartialType } from '@nestjs/swagger';
import { CreateDamageReportDto } from './create-damage-report.dto';

export class UpdateDamageReportDto extends PartialType(CreateDamageReportDto) {}
