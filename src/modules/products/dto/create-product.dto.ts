import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'SKU-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Widget A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'A high-quality widget' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'pcs' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: '8851234567890' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 100.50 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  costPrice: number;

  @ApiProperty({ example: 150.00 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  salePrice: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'ITM-001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'kinh_cuong_luc', default: 'khac' })
  @IsOptional()
  @IsString()
  glassType?: string;

  @ApiPropertyOptional({ example: 8.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  thickness?: number;

  @ApiPropertyOptional({ example: 'trong', default: 'trong' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: '2440x3660', default: '-' })
  @IsOptional()
  @IsString()
  standardSize?: string;

  @ApiPropertyOptional({ example: 2440.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lengthMm?: number;

  @ApiPropertyOptional({ example: 3660.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  widthMm?: number;

  @ApiPropertyOptional({ example: 8.9304, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  areaM2?: number;

  @ApiPropertyOptional({ example: 10, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minStock?: number;

  @ApiPropertyOptional({ example: 'uuid-of-supplier' })
  @IsOptional()
  @IsString()
  supplierId?: string;
}
