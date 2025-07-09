// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpException.name);
  catch(exception: unknown, host: ArgumentsHost) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.error(exception);
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // If it's an Unauthorized or Forbidden exception and the request is from a browser, redirect to login
    if (
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) &&
      request.headers.accept &&
      request.headers.accept.includes('text/html')
    ) {
      return response.redirect('/admin/login');
    }

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    response.status(status).json({
      success: false,
      error: {
        code: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        ...(typeof errorResponse === 'object'
          ? errorResponse
          : { message: errorResponse }),
      },
    });
  }
}
