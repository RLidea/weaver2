import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_MODE_CONFIG, readAuthModeConfig } from './auth-mode';

/** `AUTH_MODE_CONFIG` 를 앱 전체에 내준다. 값이 틀리면 여기서 던져 부팅이 멈춘다 */
@Global()
@Module({
  providers: [
    {
      provide: AUTH_MODE_CONFIG,
      useFactory: (config: ConfigService) =>
        readAuthModeConfig((key) => config.get<string>(key)),
      inject: [ConfigService],
    },
  ],
  exports: [AUTH_MODE_CONFIG],
})
export class AuthModeModule {}
