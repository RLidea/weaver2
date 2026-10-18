import { NestFactory } from '@nestjs/core';
import { CoreModule } from './core.module';
import { setNestApp } from '@weaver2/common/global/nest.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, VersioningType } from '@nestjs/common';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { winstonLoggerConfig } from '@weaver2/common/global/logger/winston.config';
import { warnIfEnvFileExposed } from '@weaver2/common/global/env-file-permission';
import { CORE_ENV_FILE_PATH } from './env-file';

async function bootstrap() {
  const startTime = Date.now();

  const app = await NestFactory.create<NestExpressApplication>(CoreModule, {
    logger: WinstonModule.createLogger(winstonLoggerConfig),
  });
  const configService = app.get(ConfigService);
  // 비밀값(JWT_SECRET·TOTP_ENCRYPTION_KEY)이 든 파일이 다른 계정에 열려 있으면 알린다
  warnIfEnvFileExposed(CORE_ENV_FILE_PATH);

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
  });

  // 업로드 파일은 정적으로 내걸지 않는다 — 내주는 길은 권한을 묻는 /v1/files 하나다
  // (파일 접근 통제 설계 §4.2). 로컬 저장소 디렉터리(uploads/)는 그대로 두되 웹에 노출하지 않는다.

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
