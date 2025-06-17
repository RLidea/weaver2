import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { setMiddleware } from '@weaver2/common/middleware';
import { setPipe } from '@weaver2/common/websocket/pipe';

export function setNestApp<T extends INestApplication>(app: T): void {
  /* Request lifecycle */

  // Middleware
  setMiddleware(app);
  // Guards
  // Interceptors
  // Pipes
  setPipe(app);
  // Filters

  // 앱 종료시 이벤트 후크 설정
  app.enableShutdownHooks();

  // API document
  const title = process.env.APP_NAME;
  const config = new DocumentBuilder()
    .setTitle(`${title} Document`)
    .setDescription(`The ${title} API description`)
    .setVersion('1.0')
    .addTag(title || 'doc')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

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
