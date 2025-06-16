import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from '@weaver2/prisma';
import { RequestLoggerMiddleware } from '@weaver2/common/configs/middleware/request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UserModule,
    PrismaModule,
  ],
  controllers: [CoreController],
  providers: [CoreService],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
