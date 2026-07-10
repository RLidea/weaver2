import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { setMiddleware } from './middleware';
import { setPipe } from './pipe';
import { setInterceptor } from '@weaver2/common/global/interceptor';
import { setExceptionFilter } from '@weaver2/common/global/exception-filter';

/**
 * Swagger 문서 설정. 런타임 /docs와 빌드 타임 스펙 추출 스크립트가 동일 설정을 공유하도록 export한다.
 * (scripts/generate-openapi.ts 에서 재사용)
 */
export function buildSwaggerConfig() {
  const title = process.env.APP_NAME;
  return new DocumentBuilder()
    .setTitle(`${title} Document`)
    .setDescription(`The ${title} API description`)
    .setVersion('1.0')
    .addTag(title || 'doc')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Token',
      },
      'ACCESS-TOKEN',
    )
    .build();
}

export function setNestApp<T extends INestApplication>(app: T): void {
  /* Request lifecycle */

  setMiddleware(app);
  setInterceptor(app);
  setPipe(app);
  setExceptionFilter(app);

  // 앱 종료시 이벤트 후크 설정
  app.enableShutdownHooks();

  // API document
  if (process.env.NODE_ENV !== 'production') {
    const config = buildSwaggerConfig();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory);
  }

  /*
  * https://docs.nestjs.com/faq/request-lifecycle#middleware
  * Nest.JS Request Lifecycle
    1. Incoming request
    2. Middleware
        2.1. Globally bound middleware
        2.2. Module bound middleware
    3. Guards
        3.1 Global guards
        3.2 Controller guards
        3.3 Route guards
    4. Interceptors (pre-controller)
        4.1 Global interceptors
        4.2 Controller interceptors
        4.3 Route interceptors
    5. Pipes
        5.1 Global pipes
        5.2 Controller pipes
        5.3 Route pipes
        5.4 Route parameter pipes
    6. Controller (method handler)
    7. Service (if exists)
    8. Interceptors (post-request)
        8.1 Route interceptor
        8.2 Controller interceptor
        8.3 Global interceptor
    9. Exception filters
        9.1 route
        9.2 controller
        9.3 global
    10. Server response
  * */
}
