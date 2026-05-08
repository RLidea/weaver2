/* eslint-disable */
import helmet from 'helmet';
import { INestApplication, Logger } from '@nestjs/common';
import { doubleCsrf } from 'csrf-csrf';
import * as process from 'process';
import { Request, Response, NextFunction } from 'express';

/**
 * CSRF용 double-submit token 핸들러.
 *
 * - cookie 이름: `__Host-csrf-token` (prod) / `csrf-token` (dev)
 * - header 이름: `x-csrf-token`
 * - GET/HEAD/OPTIONS는 무시
 *
 * `csurf@1.11.0`이 2022년부터 deprecated되어 더 이상 보안 패치가 들어오지
 * 않으므로 `csrf-csrf`(double-submit)로 교체했다.
 */
export const csrfHandler = doubleCsrf({
  getSecret: () =>
    process.env.CSRF_SECRET ??
    process.env.JWT_SECRET ??
    'fallback-csrf-secret-change-me',
  getSessionIdentifier: (req: Request) =>
    (req.cookies as Record<string, string> | undefined)?.refresh_token ??
    req.ip ??
    'anonymous',
  cookieName:
    process.env.NODE_ENV === 'production' ? '__Host-csrf-token' : 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req: Request) =>
    (req.headers['x-csrf-token'] as string | undefined) ?? '',
});

export function setSecurityMiddleware(app: INestApplication): void {
  const logger = new Logger('Security');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", 'https://cdnjs.cloudflare.com'],
        },
      },
    }),
  );
  app.use(helmet.hidePoweredBy());

  /*
    CORS
   */
  const whitelist = [
    ...(process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
    undefined, // Postman/Insomnia 등 origin 없는 경우
  ];
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked for: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    allowedHeaders:
      'X-Requested-With, X-HTTP-Method-Override, Content-Type, Cookie, Accept, Observe, Authorization, X-CSRF-Token',
    methods: 'GET,PUT,POST,DELETE,OPTIONS,PATCH',
    credentials: true,
  });

  /*
    CSRF — Swagger(/docs) 와 매칭되는 origin은 면제
   */
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const swaggerOrigin = process.env.ORIGIN_URL;

    const isSwagger =
      (!!swaggerOrigin && !!origin && origin.includes(swaggerOrigin)) ||
      (!!referer && referer.includes('/docs'));

    if (isSwagger) return next(); // ✅ Swagger는 CSRF 제외

    return csrfHandler.doubleCsrfProtection(req, res, next);
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err === csrfHandler.invalidCsrfTokenError) {
      logger.warn(
        `CSRF blocked: ${req.method} ${req.originalUrl} origin=${req.headers.origin} ip=${req.ip}`,
      );
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token',
      });
    }
    next(err);
  });
}
