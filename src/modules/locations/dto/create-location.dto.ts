import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({ example: 'KHO-A1', description: 'Mã vị trí' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 'Kệ A1', description: 'Tên vị trí' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'A', description: 'Khu vực (Zone)' })
  @IsNotEmpty()
  @IsString()
  zone: string;

  @ApiPropertyOptional({ example: 'Kệ chứa kính cường lực', description: 'Mô tả chi tiết' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
