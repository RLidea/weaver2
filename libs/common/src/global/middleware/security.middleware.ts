import helmet from 'helmet';
import { INestApplication } from '@nestjs/common';

export function setSecurityMiddleware(app: INestApplication): void {
  app.use(helmet());
  app.use(helmet.hidePoweredBy());
}
