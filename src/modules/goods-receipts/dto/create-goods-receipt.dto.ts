import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class GoodsReceiptLineDto {
  @ApiProperty({ description: 'ID sản phẩm/vật tư' })
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'ID vị trí nhập kho' })
  @IsNotEmpty()
  @IsUUID()
  locationId: string;

  @ApiProperty({ description: 'Số lượng' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Tình trạng (tot, vo, xuoc, ...)' })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateGoodsReceiptDto {
  @ApiPropertyOptional({ description: 'Ngày nhập kho' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @ApiPropertyOptional({ description: 'ID nhà cung cấp' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Người giao hàng' })
  @IsOptional()
  @IsString()
  deliveredBy?: string;

  @ApiPropertyOptional({ description: 'Số xe' })
  @IsOptional()
  @IsString()
  vehicleNo?: string;

  @ApiPropertyOptional({ description: 'ID người nhận hàng' })
  @IsOptional()
  @IsUUID()
  receivedById?: string;

  @ApiPropertyOptional({ description: 'Số chứng từ' })
  @IsOptional()
  @IsString()
  documentNo?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [GoodsReceiptLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptLineDto)
  lines: GoodsReceiptLineDto[];
}
