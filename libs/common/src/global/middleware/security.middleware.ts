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

function parseUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * url 이 Swagger 가 떠 있는 백엔드 자신의 origin 과 **정확히** 같은가.
 *
 * ORIGIN_URL 은 관례상 스킴 없는 `host:port`(예: `localhost:4000`)라 그때는 host 를,
 * 스킴까지 적었으면(`https://api.example.com`) origin 전체를 비교한다.
 * 예전엔 부분 문자열(includes)이라 `localhost:4000.evil.com` 도 통과했다.
 */
function isSwaggerOrigin(url: URL, swaggerOrigin: string): boolean {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (swaggerOrigin.includes('://')) {
    return url.origin === parseUrl(swaggerOrigin)?.origin;
  }
  return url.host === swaggerOrigin.trim().toLowerCase();
}

/**
 * Swagger UI(/docs)에서 보낸 요청인가.
 *
 * - ORIGIN_URL 미설정 → 아무것도 면제하지 않는다
 * - Origin 이 Swagger origin 과 같거나,
 * - Referer 가 같은 origin 의 `/docs` 또는 `/docs/…` 일 때만 면제한다
 *   (예전엔 Referer 에 `/docs` 가 들어 있기만 하면 — `https://evil.com/docs` 도 — 면제됐다)
 *
 * 🔴 NODE_ENV 로 거르지 않는다 — 환경 이름은 배포에서 development 로 새어 나간 전례가 있다.
 */
function isSwaggerRequest(req: Request): boolean {
  const swaggerOrigin = process.env.ORIGIN_URL?.trim();
  if (!swaggerOrigin) return false;

  const origin = parseUrl(req.headers.origin);
  if (origin && isSwaggerOrigin(origin, swaggerOrigin)) return true;

  const referer = parseUrl(req.headers.referer);
  return (
    !!referer &&
    isSwaggerOrigin(referer, swaggerOrigin) &&
    (referer.pathname === '/docs' || referer.pathname.startsWith('/docs/'))
  );
}

/**
 * Authorization: Bearer 만 싣고 온 요청인가 — 다른 사이트는 CORS 사전 요청 없이 이 헤더를
 * 붙일 수 없고, 사전 요청은 ALLOWED_ORIGINS 가 막는다.
 * 단 인증 쿠키(access_token)가 함께 오면 면제하지 않는다 — JWT 전략이 쿠키를 먼저 읽으므로,
 * 실제로 쓰이는 자격 증명이 쿠키일 때는 CSRF 를 건다.
 */
function isBearerOnly(req: Request): boolean {
  const cookies = req.cookies as Record<string, string> | undefined;
  return (
    /^Bearer\s+\S+/i.test(req.headers.authorization ?? '') &&
    !cookies?.access_token
  );
}

/**
 * CSRF 검사에서 빼는 요청 조건. 파생 프로젝트는 여기에 한 줄씩 더한다.
 */
const CSRF_EXEMPTIONS: Array<(req: Request) => boolean> = [
  // Swagger(/docs) — 백엔드 자신의 origin 에서 온 요청만
  isSwaggerRequest,
  // provider 가 form_post 로 보내는 OAuth 콜백 — state 대조로 막는다
  isCrossSiteCallback,
  // 쿠키 없이 Bearer 로만 온 요청 — 범위 토큰(api-token) · 앱
  isBearerOnly,
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
