import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsUUID, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class TransferStockDto {
  @ApiProperty({ description: 'ID sản phẩm/vật tư' })
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'ID vị trí nguồn' })
  @IsNotEmpty()
  @IsUUID()
  fromLocationId: string;

  @ApiProperty({ description: 'ID vị trí đích' })
  @IsNotEmpty()
  @IsUUID()
  toLocationId: string;

  @ApiProperty({ description: 'Số lượng chuyển' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ description: 'Trạng thái hàng (mặc định: tot)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  note?: string;
}
