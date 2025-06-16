import { INestApplication, VersioningType } from '@nestjs/common';
import { setSecurityMiddleware } from '@weaver2/common/configs/middleware/security.middleware';

export function setMiddleware<T extends INestApplication>(app: T): void {
  app.enableVersioning({
    type: VersioningType.URI,
  });
  setSecurityMiddleware(app);
}
