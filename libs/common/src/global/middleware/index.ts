import { INestApplication, VersioningType } from '@nestjs/common';
import { setSecurityMiddleware } from './security.middleware';
import { setTrustProxy } from './trust-proxy';
import cookieParser from 'cookie-parser';

export function setMiddleware<T extends INestApplication>(app: T): void {
  // req.ip 를 읽는 것(스로틀·CSRF·로그)보다 먼저
  setTrustProxy(app);

  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // parsing cookie

  app.use(cookieParser());

  // Security
  setSecurityMiddleware(app);
}
