import { NestFactory } from '@nestjs/core';
import { CoreModule } from './core.module';
import { setNestApp } from '@weaver2/common/global/nest.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, VersioningType } from '@nestjs/common';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { winstonLoggerConfig } from '@weaver2/common/global/logger/winston.config';

async function bootstrap() {
  const startTime = Date.now();

  const app = await NestFactory.create<NestExpressApplication>(CoreModule, {
    logger: WinstonModule.createLogger(winstonLoggerConfig),
  });
  const configService = app.get(ConfigService);

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
  });

  // Serve static files from the 'uploads' directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
    dotfiles: 'deny',
    index: false,
    redirect: false,
  });

  // Legacy admin/health view assets. HTML 파일들은 별도 view controller에서
  // 명시적으로 서빙하므로 여기서는 css/js만 의도된 노출. dotfile/index 차단
  // 으로 의도치 않은 디렉토리 listing이나 .DS_Store 등을 막는다.
  app.useStaticAssets(join(process.cwd(), 'apps/core-backend/src/assets'), {
    prefix: '/',
    dotfiles: 'deny',
    index: false,
    redirect: false,
  });

  setNestApp(app);
  const port = configService.get<number>('PORT') ?? 4000;
  await app.listen(port);

  const bootTime = Date.now() - startTime;
  const locale = configService.get<string>('APP_LOCALE') ?? 'ko-KR';
  const timezone = configService.get<string>('APP_TIMEZONE') ?? 'Asia/Seoul';
  const currentTime = new Date().toLocaleString(locale, {
    timeZone: timezone,
    hour12: false,
  });

  const logger = new Logger('Bootstrap');
  logger.log(
    `🟢 ${configService.get<string>(
      'APP_NAME',
    )} is running on port ${port} (${configService.get<string>('NODE_ENV')}) - Started in ${bootTime}ms at ${currentTime}`,
  );
}
void bootstrap();
