import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
  }
}

export class ApiSuccessResponse<T = any> {
  @ApiProperty({ example: true })
  success: boolean = true;

  @ApiProperty()
  data: T;

  @ApiPropertyOptional()
  meta?: PaginationMeta;

  constructor(data: T, meta?: PaginationMeta) {
    this.success = true;
    this.data = data;
    this.meta = meta;
  }
}

export class ApiErrorDetail {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code: string;

  @ApiProperty({ example: 'Human readable message' })
  message: string;

  @ApiPropertyOptional()
  details?: Record<string, any>;
}

export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success: boolean = false;

  @ApiProperty()
  error: ApiErrorDetail;

  constructor(code: string, message: string, details?: Record<string, any>) {
    this.success = false;
    this.error = { code, message, details };
  }
}
