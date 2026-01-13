import { NestFactory } from '@nestjs/core';
import { CoreModule } from './core.module';
import { setNestApp } from '@weaver2/common/global/nest.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, VersioningType } from '@nestjs/common';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const startTime = Date.now();

  const app = await NestFactory.create<NestExpressApplication>(CoreModule, {
    logger: ['error', 'warn'],
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
  });

  app.useStaticAssets(join(process.cwd(), 'apps/core/src/assets'), {
    prefix: '/',
  });

  setNestApp(app);
  const port = configService.get<number>('PORT') ?? 3000;
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
