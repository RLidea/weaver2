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

/**
 * 컨트롤러가 돌려준 값을 `{ message, data }` 로 감싼다.
 *
 * - 컨트롤러는 **값만** 돌려준다. `{ success, message, data }` 처럼 미리 싸면 한 겹 더 싸여
 *   화면이 받는 data 가 `{ success, data }` 가 된다.
 * - 돌려준 객체에 최상위 `message` 키가 있으면 그것을 응답 message 로 떼어 내고 **나머지**를 data 로
 *   싼다. 그러니 값 자체에 `message` 라는 칸이 필요하면 한 단계 안쪽에 둔다.
 */
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
