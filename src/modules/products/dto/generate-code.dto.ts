import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateCodeDto {
  @ApiProperty({ example: 'kinh_cuong_luc' })
  @IsNotEmpty()
  @IsString()
  glassType: string;

  @ApiProperty({ example: 8 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  thickness: number;

  @ApiProperty({ example: 'trong' })
  @IsNotEmpty()
  @IsString()
  color: string;

  @ApiProperty({ example: '2440x3660' })
  @IsNotEmpty()
  @IsString()
  size: string;
}
