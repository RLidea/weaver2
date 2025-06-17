import { INestApplication } from '@nestjs/common';
import { setMiddleware } from '@weaver2/common/configs/middleware';
import { setPipe } from 'libs/common/src/configs/pipe';

export function setNestApp<T extends INestApplication>(app: T): void {
  app.enableShutdownHooks();

  setMiddleware(app);
  setPipe(app);
}
