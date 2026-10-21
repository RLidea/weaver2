import { Controller, Get, Inject, Logger, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { join } from 'path';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { SignInService } from '../../../../core/auth/services/sign-in.service';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  setAuthCookies,
  clearAuthCookies,
} from '../../../../core/auth/utils/auth-cookie.util';
import {
  AUTH_MODE_CONFIG,
  AuthModeConfig,
} from '../../../../core/auth/auth-mode';
import { LocalAuthOnly } from '../../../../core/auth/decorators/local-auth-only.decorator';

// sendFile 에 root 를 준다 — root 가 없으면 `send` 가 절대경로 전체에서 점으로 시작하는
// 세그먼트를 찾아 404(→ 500)를 낸다. 저장소가 `.claude/worktrees/…`(레인) 아래면 화면이 안 뜬다.
const ASSETS_ROOT = join(process.cwd(), 'apps/core-backend/src/assets');

@ApiExcludeController()
@Controller({ path: 'admin' })
export class AdminAuthViewController {
  private readonly logger = new Logger(AdminAuthViewController.name);

  constructor(
    private readonly signInService: SignInService,
    private readonly configService: ConfigService,
    @Inject(AUTH_MODE_CONFIG) private readonly authMode: AuthModeConfig,
  ) {}

  @Public()
  @Get('login')
  async getLoginPageUnauthenticated(
    @Req() req: Request,
    @Res() res: Response,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    this.logger.debug(JSON.stringify(authUser));

    // HttpOnly 쿠키에서 refresh token 확인
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.refresh_token;

    const isProduction = this.configService.get('NODE_ENV') === 'production';

    if (refreshToken && typeof refreshToken === 'string') {
      try {
        // refresh token으로 토큰 회전(새 access + 새 refresh 발급)
        const result = await this.signInService.refresh(refreshToken);

        if (result?.accessToken) {
          // 회전된 새 access·refresh 토큰을 모두 쿠키에 세팅한다.
          // (새 refresh 토큰을 버리면 브라우저에 남은 옛 쿠키가 다음 refresh에서
          //  재사용 감지에 걸려 정상 사용자의 전 세션이 무효화되는 오탐이 발생함)
          setAuthCookies(res, result, isProduction);

          this.logger.debug(
            'Valid refresh token found, tokens rotated, redirecting to dashboard',
          );
          return res.redirect('/admin/security');
        }
      } catch {
        this.logger.debug('Invalid refresh token, clearing cookies');
        // 무효한 토큰이면 쿠키 삭제
        clearAuthCookies(res, isProduction);
      }
    }

    // sso 면 로그인 칸을 닫고 프런트 로그인으로 안내한다 — 이 뷰는 백엔드 출처에서만 뜨는데
    // SSO 콜백 · 세션 쿠키의 출처는 프런트(CLIENT_URL)라 여기서 SSO 를 붙일 수 없다
    if (this.authMode.mode === 'sso') {
      res.type('html').send(this.ssoNoticePage());
      return;
    }

    // 토큰이 없거나 무효하면 로그인 페이지 렌더링
    res.sendFile('admin/admin-login.html', { root: ASSETS_ROOT });
  }

  @Public()
  @LocalAuthOnly()
  @Get('request-password-reset')
  getRequestPasswordResetPage(@Res() res: Response) {
    res.sendFile('admin/request-password-reset.html', { root: ASSETS_ROOT });
  }

  @Public()
  @LocalAuthOnly()
  @Get('reset-password')
  getResetPasswordPage(@Res() res: Response) {
    res.sendFile('reset-password.html', { root: ASSETS_ROOT });
  }

  private ssoNoticePage(): string {
    const clientUrl = (
      this.configService.get<string>('CLIENT_URL') ?? ''
    ).replace(/\/+$/, '');
    const loginUrl = escapeHtml(`${clientUrl}/login?redirect=/admin`);
    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Portal</title>
    <link href="/admin/css/admin-login.css" rel="stylesheet">
</head>
<body>
<div class="login-container glass glow-border shine" id="ssoNotice">
    <div class="login-header">
        <h1 class="login-title text-primary text-shadow">Admin Portal</h1>
        <p class="login-subtitle text-secondary">관리 화면 로그인은 <a href="${loginUrl}">${loginUrl}</a> 에서 합니다.</p>
    </div>
</div>
</body>
</html>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
