import { INestApplication } from '@nestjs/common';
import { HttpExceptionFilter } from '@weaver2/common/global/exception-filter/http-exception.filter';
import { PrismaClientExceptionFilter } from '@weaver2/common/global/exception-filter/prisma-exception.filter';

export function setExceptionFilter<T extends INestApplication>(app: T): void {
  app.useGlobalFilters(new HttpExceptionFilter()); // global http exception filter
  app.useGlobalFilters(new PrismaClientExceptionFilter()); // global db exception filter
}
