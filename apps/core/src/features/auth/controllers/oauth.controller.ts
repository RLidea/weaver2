import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { OAuthService } from '../oauth/oauth.service';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10분

@ApiTags('Auth')
@Controller({ path: 'auth/oauth', version: '1' })
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('connections')
  @ApiOperation({ summary: '내 소셜 계정 연동 목록 조회' })
  getMyConnections(@AuthUser() authUser: CommonAuthUserDto) {
    return this.oauthService.getMyConnections(authUser.authId);
  }

  @Delete('connections/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '소셜 계정 연동 해제' })
  async disconnectProvider(
    @AuthUser() authUser: CommonAuthUserDto,
    @Param('provider') provider: string,
  ) {
    await this.oauthService.disconnectProvider(authUser.authId, provider);
    return { message: `${provider} connection has been disconnected.` };
  }

  @Public()
  @Get(':provider')
  @ApiOperation({ summary: 'OAuth 제공자 로그인 페이지로 리다이렉트' })
  redirectToProvider(
    @Param('provider') provider: string,
    @Res() res: Response,
  ): void {
    const { url, state } = this.oauthService.getAuthorizationUrl(provider);
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: OAUTH_STATE_TTL_MS,
    });

    res.redirect(url);
  }

  @Public()
  @Get(':provider/callback')
  @ApiOperation({ summary: 'OAuth 콜백 처리 및 JWT 발급' })
  async handleCallback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const failureUrl =
      this.configService.get<string>('OAUTH_FAILURE_REDIRECT_URL') ?? '/';

    const cookies = req.cookies as Record<string, string> | undefined;
    const cookieState = cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE);

    if (error || !code || !state) {
      res.redirect(failureUrl);
      return;
    }

    await this.oauthService.handleOAuthCallback(
      provider,
      code,
      state,
      cookieState ?? '',
      res,
    );
  }
}
