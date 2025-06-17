import { SuccessInterceptor } from '@weaver2/common/global/interceptor/success-response.interceptor';
import { ClassSerializerInterceptor, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export function setInterceptor<T extends INestApplication>(app: T): void {
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalInterceptors(new SuccessInterceptor());
}
