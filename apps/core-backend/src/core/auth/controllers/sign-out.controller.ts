import { Controller, Inject, Logger, Post, Req, Res } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { SignOutService } from '../services/sign-out.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '@weaver2/common/decorator/public.decorator';
import {
  clearAuthCookies,
  clearPreAuthCookie,
} from '../utils/auth-cookie.util';
import { AUTH_MODE_CONFIG, AuthModeConfig } from '../auth-mode';
import { OIDC_CLIENT, OidcClient } from '../oidc/oidc-client';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class SignOutController {
  private readonly logger = new Logger(SignOutController.name);

  constructor(
    private readonly signOutService: SignOutService,
    private readonly configService: ConfigService,
    @Inject(AUTH_MODE_CONFIG) private readonly authMode: AuthModeConfig,
    @Inject(OIDC_CLIENT) private readonly oidc: OidcClient | null,
  ) {}

  // 액세스 토큰이 이미 없거나 만료된 브라우저도 쿠키를 지울 수 있어야 한다 — 가드가 막으면
  // 핸들러에 닿지 않아 쿠키가 남고, 화면은 /login ↔ /dashboard 사이에서 멈춘다.
  // CSRF 검사는 그대로라 다른 사이트가 강제로 로그아웃시키지는 못한다.
  @Public()
  @Post('sign-out')
  @ApiOperation({
    summary: '로그아웃 및 인증 쿠키 삭제',
    description:
      'AUTH_MODE=sso 면 응답에 endSessionUrl(발급자의 end_session)을 싣는다 — 화면이 그리로 문서 이동한다',
  })
  async signOut(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.refresh_token;
    try {
      if (refreshToken) {
        await this.signOutService.signOut(refreshToken);
      }
    } finally {
      const isProduction = this.configService.get('NODE_ENV') === 'production';
      clearAuthCookies(res, isProduction);
      // 로그아웃한 브라우저에 2FA 대기가 남지 않게
      clearPreAuthCookie(res, isProduction);
    }
    // 로컬 세션을 **먼저** 지웠다. 그다음 sso 면 발급자 세션도 끝내러 보낼 주소를 준다(D8).
    // 발급자에 닿지 못해도 로그아웃은 성공이다 — 주소만 빠진다
    return {
      message: 'Successfully signed out',
      ...(await this.endSessionUrl()),
    };
  }

  private async endSessionUrl(): Promise<{ endSessionUrl?: string }> {
    if (this.authMode.mode !== 'sso' || !this.oidc) return {};
    try {
      return {
        endSessionUrl: await this.oidc.endSessionUrl({
          state: randomBytes(16).toString('base64url'),
        }),
      };
    } catch (err) {
      this.logger.warn(
        `SSO end_session url unavailable: ${(err as Error).message}`,
      );
      return {};
    }
  }
}
