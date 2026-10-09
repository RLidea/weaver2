// prisma-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@weaver2/prisma';
import { Response } from 'express';

/**
 * P2002 의 어긋난 칸 이름.
 * Prisma 6 은 `meta.target`(칸 이름 배열)을 줬다. Prisma 7 의 드라이버 어댑터(pg)는 그 자리에
 * `meta.driverAdapterError.cause.constraint` 를 준다 — `{ fields }` 또는 제약 이름 `{ index }`.
 * 제약 이름이 Prisma 기본 규칙(`{table}_{col1}_{col2}_key`)이면 칸 이름으로 되돌려
 * v6 과 같은 메시지(`Duplicate field: name`)를 낸다. 규칙 밖의 이름은 그대로 보인다.
 */
function uniqueTarget(meta: Record<string, unknown> | undefined): string {
  const target = meta?.target;
  if (Array.isArray(target)) return target.join(', ');
  if (typeof target === 'string') return target;

  const adapterError = meta?.driverAdapterError as
    | {
        cause?: {
          table?: string;
          constraint?: { fields?: string[]; index?: string };
        };
      }
    | undefined;
  const cause = adapterError?.cause;
  const constraint = cause?.constraint;
  if (constraint?.fields) return constraint.fields.join(', ');
  if (constraint?.index) {
    const prefix = `${cause?.table}_`;
    const { index } = constraint;
    if (cause?.table && index.startsWith(prefix) && index.endsWith('_key')) {
      return index.slice(prefix.length, -'_key'.length).split('_').join(', ');
    }
    return index;
  }
  return 'unknown';
}

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    switch (exception.code) {
      case 'P2002':
        statusCode = HttpStatus.CONFLICT;
        message = `Duplicate field: ${uniqueTarget(exception.meta)}`;
        break;
      case 'P2025':
        statusCode = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;
      // 기타 코드도 추가 가능
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code: statusCode,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
