// prisma-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    const target = exception.meta?.target;

    switch (exception.code) {
      case 'P2002':
        statusCode = HttpStatus.CONFLICT;
        message = `Duplicate field: ${Array.isArray(target) ? target.join(', ') : String(target)}`;
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
