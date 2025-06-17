/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  message?: string;
  data: T;
}

@Injectable()
export class SuccessInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> | Promise<Observable<Response<T>>> {
    return next.handle().pipe(
      map((response) => {
        if (response && typeof response === 'object' && 'message' in response) {
          const { message, ...data } = response as Record<string, any>;
          return {
            message,
            data: data as T,
          };
        }

        return {
          message: 'success',
          data: response,
        };
      }),
    );
  }
}
