import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { UserModule } from './core/user/user.module';
import { PrismaModule } from '@weaver2/prisma';
import { RequestLoggerMiddleware } from '@weaver2/common/global/middleware/request-logger.middleware';
import { AuthModule } from './core/auth/auth.module';
import { EmailModule } from './infrastructure/email/email.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DevThrottlerGuard } from './common/guards/dev-throttler.guard';
import { AdminModule } from './system/admin/admin.module';
import { HealthModule } from './system/health/health.module';
import { StaticModule } from './system/static/static.module';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { UploadModule } from './infrastructure/upload/upload.module';
import { TermsModule } from './core/terms/terms.module';
import { BoardModule } from './features/board/board.module';
import { SearchModule } from './features/search/search.module';
import { AnalyticsModule } from './infrastructure/analytics/analytics.module';
import { PermissionModule } from './core/permission/permission.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationModule } from './core/notification/notification.module';
import { ReportModule } from './features/report/report.module';
import { SystemSettingModule } from './infrastructure/config/system-setting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/core-backend/.env',
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
    }),
    JwtModule.registerAsync({
      global: true, // 글로벌 설정
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // @nestjs/jwt 11.0.2 부터 expiresIn 이 `number | ms.StringValue` 로 좁아졌다
          // (`'1h'` 같은 템플릿 리터럴 타입). 값은 .env 에서 오므로 컴파일 시점에
          // 검증할 수 없어 단언한다. 형식이 틀리면 jsonwebtoken 이 런타임에 던진다.
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ||
            '1h') as JwtSignOptions['expiresIn'],
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    EventEmitterModule.forRoot(),
    UserModule,
    PrismaModule,
    PermissionModule,
    SystemSettingModule,
    AuthModule,
    EmailModule,
    AdminModule,
    UploadModule,
    TermsModule,
    BoardModule,
    SearchModule,
    AnalyticsModule,
    NotificationModule,
    ReportModule,
    HealthModule,
    StaticModule,
  ],
  controllers: [CoreController],
  providers: [
    CoreService,
    {
      provide: APP_GUARD,
      useClass: DevThrottlerGuard,
    },
  ],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
