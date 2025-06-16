import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { ip, method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';

    if (originalUrl !== '/') {
      const start = Date.now(); // 요청 시작 시간 기록
      // Health Check exclude
      res.on('finish', () => {
        const { statusCode } = res;
        const duration = Date.now() - start; // 요청-응답 시간 측정

        const errorCode: string =
          typeof res?.locals?.code === 'string' ? res.locals.code : '';

        //  body
        if (originalUrl.includes('/queues/api/queues')) return; // bull dashboard 의 요청을 로그에서 제외
        this.logger.log(
          `${method} ${originalUrl}(${statusCode} / ${errorCode}) - ${ip}(${userAgent}) ${duration}ms`,
        );
      });
    }
    next();
  }
}
