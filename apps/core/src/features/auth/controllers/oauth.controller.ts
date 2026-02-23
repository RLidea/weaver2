import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { OAuthService } from '../oauth/oauth.service';

@ApiTags('Auth')
@Controller({ path: 'auth/oauth', version: '1' })
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Public()
  @Get(':provider')
  @ApiOperation({ summary: 'OAuth 제공자 로그인 페이지로 리다이렉트' })
  redirectToProvider(@Param('provider') provider: string, @Res() res: Response): void {
    const url = this.oauthService.getAuthorizationUrl(provider);
    res.redirect(url);
  }

  @Public()
  @Get(':provider/callback')
  @ApiOperation({ summary: 'OAuth 콜백 처리 및 JWT 발급' })
  async handleCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.oauthService.handleOAuthCallback(provider, code, res);
  }
}
