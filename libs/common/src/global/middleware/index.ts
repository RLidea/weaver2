import { INestApplication, VersioningType } from '@nestjs/common';
import { setSecurityMiddleware } from './security.middleware';

export function setMiddleware<T extends INestApplication>(app: T): void {
  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Security
  setSecurityMiddleware(app);
}
