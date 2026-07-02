import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @ApiPropertyOptional({ example: 'CUST-001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '+66891234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@acme.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '123 Main St, Bangkok' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '1234567890123' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({ example: 'VIP customer' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'Sale app notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'INDIVIDUAL' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ example: 'Bangkok' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ example: 'Office Tower' })
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional({ example: 'WEBSITE' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 'NEW' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: ['Kính cường lực'] })
  @IsOptional()
  @IsArray()
  productNeeds?: string[];

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  estimatedArea?: number;

  @ApiPropertyOptional({ example: 50000000 })
  @IsOptional()
  @IsNumber()
  estimatedBudget?: number;

  @ApiPropertyOptional({ example: '2026-06-30T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
