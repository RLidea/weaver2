import { INestApplication, VersioningType } from '@nestjs/common';
import { setSecurityMiddleware } from './security.middleware';
import * as cookieParser from 'cookie-parser';

export function setMiddleware<T extends INestApplication>(app: T): void {
  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // parsing cookie
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(cookieParser());

  // Security
  setSecurityMiddleware(app);
}
