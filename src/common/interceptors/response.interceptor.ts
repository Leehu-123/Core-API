import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface FormattedResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, FormattedResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<FormattedResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the data is already formatted (has success property), pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // If data has a meta property (pagination), extract it
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            data: data.data,
            meta: data.meta,
          };
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}
