import { INestApplication } from '@nestjs/common';
import { setMiddleware } from '@weaver2/common/configs/middleware';

export function setNestApp<T extends INestApplication>(app: T): void {
  app.enableShutdownHooks();

  setMiddleware(app);
}
