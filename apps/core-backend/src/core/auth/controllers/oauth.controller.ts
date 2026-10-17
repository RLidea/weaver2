import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { OAuthService } from '../oauth/oauth.service';
import {
  AccountSuspendedException,
  SignInCompletionService,
} from '../services/sign-in-completion.service';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10분

/** form_post 콜백 본문 — provider 가 보내는 그대로라 검증 DTO 로 거르지 않는다 */
interface OAuthFormPostBody {
  code?: string;
  state?: string;
  error?: string;
  /** Apple: 첫 승인 때만 오는 사용자 JSON 문자열 */
  user?: string;
}

@ApiTags('Auth')
@Controller({ path: 'auth/oauth', version: '1' })
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService,
    private readonly signInCompletionService: SignInCompletionService,
  ) {}

  @Get('connections')
  @ApiOperation({ summary: '내 소셜 계정 연동 목록 조회' })
  getMyConnections(@AuthUser() authUser: CommonAuthUserDto) {
    return this.oauthService.getMyConnections(authUser.id);
  }

  @Delete('connections/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '소셜 계정 연동 해제' })
  async disconnectProvider(
    @AuthUser() authUser: CommonAuthUserDto,
    @Param('provider') provider: string,
  ) {
    await this.oauthService.disconnectProvider(authUser.id, provider);
    return { message: `${provider} connection has been disconnected.` };
  }

  @Public()
  @Get(':provider')
  @ApiOperation({ summary: 'OAuth 제공자 로그인 페이지로 리다이렉트' })
  redirectToProvider(
    @Param('provider') provider: string,
    @Res() res: Response,
  ): void {
    const { url, state, usesFormPost } =
      this.oauthService.getAuthorizationUrl(provider);
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    // form_post 콜백(Apple)은 appleid.apple.com 에서 오는 크로스사이트 POST 라
    // SameSite=Lax 쿠키가 실리지 않는다. 그 provider 만 None 으로 두고, None 은 Secure 를 요구한다.
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: usesFormPost || isProduction,
      sameSite: usesFormPost ? 'none' : 'lax',
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
    await this.processCallback(provider, { code, state, error }, req, res);
  }

  @Public()
  @Post(':provider/callback')
  @ApiOperation({
    summary: 'OAuth 콜백 처리 (form_post — Apple)',
    description:
      'response_mode=form_post 를 쓰는 provider 의 콜백. CSRF 대신 state 쿠키 대조로 막는다.',
  })
  async handleFormPostCallback(
    @Param('provider') provider: string,
    @Body() body: OAuthFormPostBody,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // POST 콜백은 form_post provider(Apple)만 받는다. 다른 provider 까지 열어 두면
    // 훗날 CSRF 면제를 넓힐 때 CSRF 없는 콜백이 늘어난다.
    if (!this.oauthService.acceptsFormPost(provider)) {
      res.redirect(this.failureUrl);
      return;
    }
    await this.processCallback(provider, body ?? {}, req, res);
  }

  private get failureUrl(): string {
    return this.configService.get<string>('OAUTH_FAILURE_REDIRECT_URL') ?? '/';
  }

  private async processCallback(
    provider: string,
    params: OAuthFormPostBody,
    req: Request,
    res: Response,
  ): Promise<void> {
    const { code, state, error, user } = params;

    const cookies = req.cookies as Record<string, string> | undefined;
    const cookieState = cookies?.[OAUTH_STATE_COOKIE];
    // state 가 맞을 때만 지운다 — Apple 의 state 쿠키는 SameSite=None 이라 남의 사이트가
    // 이 콜백으로 POST 를 보내도 실린다. 아무 요청에나 지우면 진행 중인 로그인을 끊을 수 있다.
    if (cookieState && cookieState === state) {
      res.clearCookie(OAUTH_STATE_COOKIE);
    }

    if (error || !code || !state) {
      res.redirect(this.failureUrl);
      return;
    }

    try {
      const userId = await this.oauthService.resolveCallbackUser(
        provider,
        code,
        state,
        cookieState ?? '',
        { user },
      );
      // 비밀번호 로그인과 같은 끝 — 탈퇴·정지를 보고, 2FA 가 있으면 pre_auth 쿠키만 준다.
      // OAuth 에는 「로그인 유지」 선택이 없어 기본 수명으로 준다.
      const completion = await this.signInCompletionService.complete(
        userId,
        {
          provider,
          rememberMe: false,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
        res,
      );
      res.redirect(
        completion.twoFactorRequired ? this.twoFactorUrl : this.successUrl,
      );
    } catch (err) {
      // 이메일 충돌 메시지에는 이메일 주소가 들어 있다 — 로그에 개인정보를 남기지 않는다
      const reason =
        err instanceof ConflictException
          ? 'email already registered'
          : (err as Error).message;
      this.logger.error(
        `OAuth callback failed for provider=${provider}: ${reason}`,
      );
      res.redirect(this.failureRedirect(provider, err));
    }
  }

  private get successUrl(): string {
    return this.configService.get<string>('OAUTH_SUCCESS_REDIRECT_URL') ?? '/';
  }

  private get twoFactorUrl(): string {
    return (
      this.configService.get<string>('OAUTH_TWO_FACTOR_REDIRECT_URL') ??
      '/login?step=2fa'
    );
  }

  /**
   * 화면이 안내를 고를 수 있게 실패 종류를 query 로 싣는다. 덧붙이지 않고 **바꾼다** — 기본
   * 실패 URL 에 이미 `?error=oauth_failed` 가 있어, 덧붙이면 error 가 둘이 되고 화면은 첫
   * 것만 읽는다(전에는 그래서 oauth_email_conflict 안내가 뜨지 않았다).
   */
  private failureRedirect(provider: string, err: unknown): string {
    const base = this.failureUrl;
    const withError = (error: string, extra: Record<string, string> = {}) => {
      const url = new URL(base, 'http://relative.invalid');
      url.searchParams.set('error', error);
      for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
      return url.origin === 'http://relative.invalid'
        ? `${url.pathname}${url.search}`
        : url.toString();
    };
    if (err instanceof ConflictException) {
      return withError('oauth_email_conflict', { provider });
    }
    if (err instanceof AccountSuspendedException) {
      return withError('account_suspended');
    }
    return base;
  }
}
