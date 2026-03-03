import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { UserModule } from './features/user/user.module';
import { PrismaModule } from '@weaver2/prisma';
import { RequestLoggerMiddleware } from '@weaver2/common/global/middleware/request-logger.middleware';
import { AuthModule } from './features/auth/auth.module';
import { EmailModule } from './infrastructure/email/email.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DevThrottlerGuard } from './common/guards/dev-throttler.guard';
import { AdminModule } from './system/admin/admin.module';
import { HealthModule } from './system/health/health.module';
import { StaticModule } from './system/static/static.module';
import { JwtModule } from '@nestjs/jwt';
import { UploadModule } from './infrastructure/upload/upload.module';
import { TermsModule } from './features/terms/terms.module';
import { BoardModule } from './project/board/board.module';
import { SearchModule } from './project/search/search.module';
import { AnalyticsModule } from './infrastructure/analytics/analytics.module';
import { PermissionModule } from './features/permission/permission.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationModule } from './features/notification/notification.module';
import { ReportModule } from './project/report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
    }),
    JwtModule.registerAsync({
      global: true, // 글로벌 설정
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') || 'your-default-secret',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
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
