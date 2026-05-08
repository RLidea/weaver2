import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { SignOutService } from '../services/sign-out.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class SignOutController {
  constructor(private readonly signOutService: SignOutService) {}

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
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
    }
    return { message: 'Successfully signed out' };
  }
}
