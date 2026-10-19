import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_MODE_CONFIG, AuthMode, AuthModeConfig } from '../auth-mode';
import { AUTH_MODE_ONLY_KEY } from '../decorators/local-auth-only.decorator';

/**
 * `@LocalAuthOnly()` · `@SsoOnly()` 를 읽어, 지금 방식에 없는 경로를 404 로 닫는다.
 * 메타데이터만 본다 — 인증보다 먼저 돌아(AuthModule 의 APP_GUARD 중 첫째) 닫힌 경로가
 * 로그인 여부와 무관하게 늘 같은 답을 한다.
 */
@Injectable()
export class AuthModeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_MODE_CONFIG) private readonly authMode: AuthModeConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const only = this.reflector.getAllAndOverride<AuthMode | undefined>(
      AUTH_MODE_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!only || only === this.authMode.mode) return true;
    throw new NotFoundException(
      this.authMode.mode === 'sso' ? 'AUTH_MODE_SSO' : 'AUTH_MODE_LOCAL',
    );
  }
}
