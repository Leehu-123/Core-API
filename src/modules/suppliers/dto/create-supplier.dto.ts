import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEmail, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Công ty TNHH Kính Mát', description: 'Tên nhà cung cấp' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Số điện thoại' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '123 Đường Kính, Q1, TP HCM', description: 'Địa chỉ' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'contact@kinhmat.vn', description: 'Email liên hệ' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Giao hàng chậm', description: 'Ghi chú' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
