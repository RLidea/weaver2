import { INestApplication } from '@nestjs/common';
import { HttpExceptionFilter } from '@weaver2/common/global/exception-filter/http-exception.filter';

export function setExceptionFilter<T extends INestApplication>(app: T): void {
  app.useGlobalFilters(new HttpExceptionFilter());
}
