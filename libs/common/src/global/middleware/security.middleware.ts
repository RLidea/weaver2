import helmet from 'helmet';
import { INestApplication } from '@nestjs/common';
import * as csurf from 'csurf';
import * as process from 'process';

export function setSecurityMiddleware(app: INestApplication): void {
  /*
    HTTP header
   */
  app.use(helmet());
  app.use(helmet.hidePoweredBy());

  /*
    CORS
   */
  const whitelist = [
    ...(process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
    undefined, // for Postman/Insomnia
  ];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('❌ CORS blocked for:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    allowedHeaders:
      'X-Requested-With, X-HTTP-Method-Override, Content-Type, Cookie, Accept, Observe, Authorization',
    methods: 'GET,PUT,POST,DELETE,OPTIONS,PATCH',
    credentials: true,
  });

  /*
    CSRF
   */
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const userAgent = req.headers['user-agent'];

    const isSwagger =
      origin?.includes(process.env.ORIGIN_URL) ||
      referer?.includes('/docs') ||
      userAgent?.includes('Swagger');

    if (isSwagger) return next(); // ✅ Swagger는 CSRF 제외

    return csurf({
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    })(req, res, next);
  });
  app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
      console.warn('🚫 CSRF BLOCKED:', {
        url: req.originalUrl,
        method: req.method,
        origin: req.headers.origin,
        referer: req.headers.referer,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token',
      });
    }

    next(err); // 다른 에러는 Nest로 전달
  });
}
