import { INestApplication } from '@nestjs/common';
import { setMiddleware } from '@weaver2/common/configs/middleware';
import { setPipe } from '@weaver2/common/configs/Pipe';

export function setNestApp<T extends INestApplication>(app: T): void {
  app.enableShutdownHooks();

  setMiddleware(app);
  setPipe(app);
}
