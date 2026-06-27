import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryInventoryDto {
  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo mã, tên vật tư' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Loại kính' })
  @IsOptional()
  @IsString()
  glassType?: string;

  @ApiPropertyOptional({ description: 'Độ dày kính' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  thickness?: number;

  @ApiPropertyOptional({ description: 'Màu kính' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID vị trí' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;

  @ApiPropertyOptional({ description: 'Trạng thái (tot, vo, lo, ...)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
