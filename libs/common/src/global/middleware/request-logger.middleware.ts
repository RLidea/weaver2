import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * 로그인 콜백의 쿼리에는 일회용 code · state 가 실린다. 로그는 오래 남고 여러 손을 거치므로 그 경로는
 * 쿼리를 떼고 경로만 남긴다(SSO · OAuth 콜백).
 */
const CALLBACK_PATH = /\/auth\/(?:oidc|oauth\/[^/]+)\/callback\/?$/;

export function loggableUrl(originalUrl: string): string {
  const path = originalUrl.split('?')[0];
  return CALLBACK_PATH.test(path) ? path : originalUrl;
}

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
          `${method} ${loggableUrl(originalUrl)}(${statusCode} / ${errorCode}) - ${ip}(${userAgent}) ${duration}ms`,
        );
      });
    }
    next();
  }
}
