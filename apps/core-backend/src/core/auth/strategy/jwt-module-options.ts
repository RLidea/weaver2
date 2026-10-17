import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';
import { TOKEN_AUDIENCE } from './token-audience';

/**
 * 앱 전역 JwtModule 의 옵션. core.module.ts 와 인증 회귀 시험이 같은 것을 쓴다 —
 * 시험이 따로 옵션을 적으면 운영 설정이 바뀌어도 시험은 옛 설정으로 녹색이 된다.
 */
export function jwtModuleOptions(
  configService: ConfigService,
): JwtModuleOptions {
  return {
    secret: configService.getOrThrow<string>('JWT_SECRET'),
    signOptions: {
      // @nestjs/jwt 11.0.2 부터 expiresIn 이 `number | ms.StringValue` 로 좁아졌다
      // (`'1h'` 같은 템플릿 리터럴 타입). 값은 .env 에서 오므로 컴파일 시점에
      // 검증할 수 없어 단언한다. 형식이 틀리면 jsonwebtoken 이 런타임에 던진다.
      expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ||
        '1h') as JwtSignOptions['expiresIn'],
      // 따로 말하지 않고 찍은 토큰은 액세스 토큰이다 (token-audience.ts)
      audience: TOKEN_AUDIENCE.ACCESS,
    },
    // 따로 말하지 않고 읽는 토큰도 액세스 토큰이어야 한다 — pre-auth 토큰이 끼면 거절
    verifyOptions: { audience: TOKEN_AUDIENCE.ACCESS },
  };
}
