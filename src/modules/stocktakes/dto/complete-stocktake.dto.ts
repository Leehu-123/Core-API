import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CompleteStocktakeDto {
  @ApiPropertyOptional({ description: 'Tự động tạo phiếu điều chỉnh cho các mã có chênh lệch' })
  @IsOptional()
  @IsBoolean()
  createAdjustment?: boolean;
}
