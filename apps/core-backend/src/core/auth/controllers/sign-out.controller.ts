import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { SignOutService } from '../services/sign-out.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '@weaver2/common/decorator/public.decorator';
import {
  clearAuthCookies,
  clearPreAuthCookie,
} from '../utils/auth-cookie.util';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class SignOutController {
  constructor(
    private readonly signOutService: SignOutService,
    private readonly configService: ConfigService,
  ) {}

  // 액세스 토큰이 이미 없거나 만료된 브라우저도 쿠키를 지울 수 있어야 한다 — 가드가 막으면
  // 핸들러에 닿지 않아 쿠키가 남고, 화면은 /login ↔ /dashboard 사이에서 멈춘다.
  // CSRF 검사는 그대로라 다른 사이트가 강제로 로그아웃시키지는 못한다.
  @Public()
  @Post('sign-out')
  @ApiOperation({ summary: '로그아웃 및 인증 쿠키 삭제' })
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
    return { message: 'Successfully signed out' };
  }
}
