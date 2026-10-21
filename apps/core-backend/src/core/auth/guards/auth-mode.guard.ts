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
 * 메타데이터만 본다. 인증(JwtAuthGuard) 다음에 돈다 — 공개 경로는 인증을 지나 여기서 404,
 * 로그인이 필요한 닫힌 경로는 로그인 전엔 401 · 로그인 뒤엔 404 다. 어느 쪽이든 닿지 못한다.
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
