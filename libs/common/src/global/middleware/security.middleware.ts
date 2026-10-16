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

/**
 * 다른 사이트가 브라우저를 통해 POST 로 넘겨주는 콜백 경로.
 * Apple 로그인은 `response_mode=form_post` 라 appleid.apple.com 이 이 경로로 form 을 POST 한다.
 * 그 요청에는 우리 CSRF 토큰이 있을 수 없고 Origin 도 우리 것이 아니므로 CSRF·CORS 거절에서 뺀다.
 * 대신 OAuth state 쿠키 대조가 위조 요청을 막는다(oauth.controller.ts).
 */
const CROSS_SITE_CALLBACK_PATHS = ['/v1/auth/oauth/apple/callback'];

function isCrossSiteCallback(req: Request): boolean {
  return CROSS_SITE_CALLBACK_PATHS.includes(req.path);
}

/**
 * CSRF 검사에서 빼는 요청 조건. 파생 프로젝트는 여기에 한 줄씩 더한다.
 */
const CSRF_EXEMPTIONS: Array<(req: Request) => boolean> = [
  // Swagger(/docs) 와 매칭되는 origin
  (req) => {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const swaggerOrigin = process.env.ORIGIN_URL;
    return (
      (!!swaggerOrigin && !!origin && origin.includes(swaggerOrigin)) ||
      (!!referer && referer.includes('/docs'))
    );
  },
  // provider 가 form_post 로 보내는 OAuth 콜백 — state 대조로 막는다
  isCrossSiteCallback,
];

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
  const corsOptions = {
    allowedHeaders:
      'X-Requested-With, X-HTTP-Method-Override, Content-Type, Cookie, Accept, Observe, Authorization, X-CSRF-Token',
    methods: 'GET,PUT,POST,DELETE,OPTIONS,PATCH',
    credentials: true,
  };
  app.enableCors(
    (req: Request, callback: (err: Error | null, options?: object) => void) => {
      // 크로스사이트 콜백은 브라우저 내비게이션이라 CORS 헤더가 필요 없다 —
      // 허용 목록에 없는 Origin 이라고 거절(500)하지 않고 CORS 헤더 없이 통과시킨다.
      if (isCrossSiteCallback(req)) {
        callback(null, { origin: false });
        return;
      }
      const origin = req.headers.origin;
      if (!origin || whitelist.includes(origin)) {
        callback(null, { ...corsOptions, origin: true });
      } else {
        logger.warn(`CORS blocked for: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
  );

  /*
    CSRF — CSRF_EXEMPTIONS 에 걸리는 요청은 면제
   */
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (CSRF_EXEMPTIONS.some((isExempt) => isExempt(req))) return next();

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
