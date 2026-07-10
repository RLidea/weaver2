import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { SignOutService } from '../services/sign-out.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { clearAuthCookies } from '../utils/auth-cookie.util';

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
      clearAuthCookies(
        res,
        this.configService.get('NODE_ENV') === 'production',
      );
    }
    return { message: 'Successfully signed out' };
  }
}
