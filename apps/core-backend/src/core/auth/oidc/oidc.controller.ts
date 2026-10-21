import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  HttpCode,
  Inject,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerException } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { HttpExceptionFilter } from '@weaver2/common/global/exception-filter/http-exception.filter';
import { PrismaService } from '@weaver2/prisma';
import {
  AUTH_MODE_CONFIG,
  AuthModeConfig,
  SsoConfig,
  normalizeSameOriginPath,
} from '../auth-mode';
import { SsoOnly } from '../decorators/sso-only.decorator';
import {
  AccountSuspendedException,
  SignInCompletionService,
} from '../services/sign-in-completion.service';
import { DeleteRefreshTokenCommand } from '../repositories/delete-refresh-token.command';
import { clearAuthCookies } from '../utils/auth-cookie.util';
import {
  OIDC_CLIENT,
  OidcClient,
  OidcError,
  OidcFailureCode,
} from './oidc-client';
import { OidcTransaction, OidcTx } from './oidc-transaction';
import { OidcSubjectService } from './oidc-subject.service';
import {
  BackchannelLogoutResult,
  BackchannelLogoutService,
} from './backchannel-logout.service';
import { LogoutTokenError } from './oidc-logout-token';

const FAKE_ORIGIN = 'http://same-origin.invalid';
/** next 가 이보다 길면 쿠키를 키우지 않고 기본값으로 */
const NEXT_MAX_LENGTH = 1024;

function random32(): string {
  return randomBytes(32).toString('base64url');
}

function headerValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return typeof value === 'string' && value ? value : undefined;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * 같은 출처의 경로만 받는다 — 로그인 화면(`safeRedirectPath`)과 같은 「가짜 출처」 방법에 더해, 점 마디를
 * 푼 결과가 `//` 로 시작하지 않는지까지 본다(`normalizeSameOriginPath`).
 */
export function safeNextPath(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value || value.length > NEXT_MAX_LENGTH) {
    return fallback;
  }
  return normalizeSameOriginPath(value) ?? fallback;
}

/**
 * 실패 주소 — tx 의 입구와 언어로 고른다. tx 를 못 읽으면 표의 `site` → 없으면 `admin` →
 * 없으면 첫 입구, 언어는 첫 값.
 */
function failurePath(
  sso: SsoConfig,
  tx: OidcTx | null,
  code: OidcFailureCode,
): string {
  const table = new Map(sso.failureUrls);
  const entry =
    tx && table.has(tx.entry)
      ? tx.entry
      : table.has('site')
        ? 'site'
        : table.has('admin')
          ? 'admin'
          : sso.failureUrls[0][0];
  const lang = tx?.lang ?? sso.langs[0];
  const url = new URL(
    table.get(entry)!.replaceAll('{lang}', encodeURIComponent(lang)),
    FAKE_ORIGIN,
  );
  url.searchParams.set('error', code);
  return `${url.pathname}${url.search}`;
}

/**
 * start · callback 이 스로틀에 걸렸을 때 — 둘 다 문서 이동이라 Nest 의 429 JSON 을 화면에 그대로
 * 보이게 된다. 가드는 핸들러보다 먼저 던지므로 여기서 받아 실패 주소에 `sso_busy` 로 보낸다.
 * tx 쿠키가 읽히면 그 입구 · 언어로(콜백), 아니면 기본 입구로(start 는 대개 쿠키가 없다).
 * local 모드면 스로틀(전역 가드)이 `AuthModeGuard` 의 404 보다 먼저 걸린다 — 실패 주소가 없으므로
 * 전역 필터에 넘겨 다른 경로와 같은 429 를 준다
 */
@Catch(ThrottlerException)
export class OidcBusyFilter implements ExceptionFilter {
  constructor(
    @Inject(AUTH_MODE_CONFIG) private readonly authMode: AuthModeConfig,
    private readonly transaction: OidcTransaction,
  ) {}

  catch(exception: ThrottlerException, host: ArgumentsHost) {
    if (this.authMode.mode !== 'sso') {
      new HttpExceptionFilter().catch(exception, host);
      return;
    }
    const http = host.switchToHttp();
    const tx = this.transaction.read(http.getRequest<Request>());
    http
      .getResponse<Response>()
      .redirect(failurePath(this.authMode.sso, tx, 'sso_busy'));
  }
}

/**
 * SSO 로그인 — 발급자(accounts)로 보내고, 돌아온 콜백에서 **지금과 같은 세션 쿠키**를 준다.
 *
 * 콜백 검사 순서(D4): ① tx 쿠키 서명 · 만료 ② state 대조(맞을 때만 tx 를 지운다 — 남이 엉터리
 * state 로 진행 중인 로그인을 끊지 못하게) ③ 응답 `iss` 가 설정한 발급자와 같다(없으면 거절 —
 * mix-up) ④ `error` ⑤ code 교환 ⑥ id_token 검증 ⑦ userinfo sub 대조 ⑧ 찾기/만들기 ⑨ 세션.
 * 실패하면 입구(`entry`)의 실패 주소에 `?error=<D13 값>` 을 실어 보낸다 — 주소는 설정의 표에서만
 * 고르므로 열린 리다이렉트가 아니다.
 */
@ApiTags('Auth - SSO')
@SsoOnly()
@Controller({ path: 'auth/oidc', version: '1' })
export class OidcController {
  private readonly logger = new Logger(OidcController.name);

  constructor(
    @Inject(AUTH_MODE_CONFIG) private readonly authMode: AuthModeConfig,
    @Inject(OIDC_CLIENT) private readonly oidc: OidcClient,
    private readonly transaction: OidcTransaction,
    private readonly subjects: OidcSubjectService,
    private readonly backchannel: BackchannelLogoutService,
    private readonly signInCompletion: SignInCompletionService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private get sso(): SsoConfig {
    // @SsoOnly 가 local 을 막으므로 여기 닿으면 sso 다
    return this.authMode.sso!;
  }

  @Public()
  // start 는 서명한 짧은 쿠키 하나만 쓴다 — 사무실 NAT 하나 뒤의 여럿이 한 IP 로 오므로 넉넉히
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseFilters(OidcBusyFilter)
  @Get('start')
  @ApiOperation({
    summary: 'SSO 로그인 시작 — 발급자의 authorize 로 302',
    description:
      'AUTH_MODE=sso 에서만. 문서 이동으로 부른다(API 호출 아님). 실패하면 입구의 실패 주소로 ?error=',
  })
  @ApiQuery({
    name: 'entry',
    required: false,
    description: '실패 주소 표의 열쇠 (기본 admin)',
  })
  @ApiQuery({
    name: 'next',
    required: false,
    description: '로그인 뒤 갈 같은 출처의 경로',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'ACCOUNTS_OIDC_LANGS 중 하나',
  })
  async start(
    @Query('entry') entry: unknown,
    @Query('next') next: unknown,
    @Query('lang') lang: unknown,
    @Res() res: Response,
  ): Promise<void> {
    const verifier = random32();
    const tx: OidcTx = {
      state: random32(),
      nonce: random32(),
      verifier,
      next: safeNextPath(next, this.sso.defaultNext),
      lang:
        typeof lang === 'string' && this.sso.langs.includes(lang)
          ? lang
          : this.sso.langs[0],
      entry: this.knownEntry(entry),
    };
    try {
      const url = await this.oidc.authorizationUrl({
        state: tx.state,
        nonce: tx.nonce,
        codeChallenge: createHash('sha256')
          .update(verifier)
          .digest('base64url'),
        lang: tx.lang,
      });
      this.transaction.write(res, tx);
      res.redirect(url);
    } catch (err) {
      this.fail(res, tx, err);
    }
  }

  @Public()
  // start 와 같게 — 낮으면 같은 NAT 에서 start 는 지났는데 발급자에서 로그인을 마치고 돌아와 sso_busy 를
  // 본다(가장 나쁜 자리에서 실패). 바깥 호출(code 교환 · userinfo)은 맞는 tx 가 있어야 나가고 tx 는
  // start 로만 생기므로, 그 수는 이미 start 의 한도가 묶는다
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseFilters(OidcBusyFilter)
  @Get('callback')
  @ApiOperation({
    summary: 'SSO 콜백 — 검증 뒤 세션 쿠키를 주고 next 로 302',
    description:
      '발급자가 보내는 최상위 GET 이라 CSRF 미들웨어 밖이다. tx 쿠키의 state 대조로 막는다',
  })
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const params = new URL(req.originalUrl, FAKE_ORIGIN).searchParams;
    const tx = this.transaction.read(req);
    if (!tx) {
      this.redirectFailure(res, null, 'sso_failed');
      return;
    }
    if (!safeEqual(params.get('state') ?? '', tx.state)) {
      // tx 는 남긴다 — 진행 중인 진짜 로그인을 끊지 않는다
      this.redirectFailure(res, tx, 'sso_failed');
      return;
    }
    this.transaction.clear(res);

    if (params.get('iss') !== this.sso.issuer) {
      this.logger.warn('SSO callback rejected: iss missing or different');
      this.redirectFailure(res, tx, 'sso_failed');
      return;
    }
    const error = params.get('error');
    if (error) {
      this.redirectFailure(
        res,
        tx,
        error === 'access_denied' ? 'sso_cancelled' : 'sso_failed',
      );
      return;
    }

    try {
      const { claims, accessToken } = await this.oidc.exchange(params, {
        state: tx.state,
        nonce: tx.nonce,
        codeVerifier: tx.verifier,
      });
      const info = await this.oidc.userinfo(accessToken, claims.sub);
      const meta = {
        sub: claims.sub,
        lang: tx.lang,
        entry: tx.entry,
        ip: req.ip,
        country: headerValue(req, 'cf-ipcountry'),
        userAgent: headerValue(req, 'user-agent'),
      };
      const { userId, created } = await this.subjects.resolve(info, meta);

      // 이 브라우저에 이미 있던 세션은 지운다 — 다른 사람의 세션이 열린 브라우저로 들어와도
      // 앞 세션 행이 남지 않게. 같은 사람이어도 지우고 새로 준다(갈래를 두지 않는다)
      const previous = (req.cookies as Record<string, unknown> | undefined)
        ?.refresh_token;
      if (typeof previous === 'string' && previous) {
        await DeleteRefreshTokenCommand(this.prisma, previous);
        clearAuthCookies(res, this.isProduction);
      }

      await this.signInCompletion.completeExternal(
        userId,
        {
          provider: 'oidc',
          rememberMe: false,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          oidcSid: claims.sid,
          // 세션을 줄 때 이 sub 가 아직 이 사람에게 이어져 있는지 잠금 아래에서 본다 — 연결 해제 · 탈퇴가 끊었으면 거절
          proof: { kind: 'sso', sub: claims.sub },
        },
        res,
      );
      if (!claims.sid) {
        // 이 세션은 sid 로그아웃이 찾지 못한다(sub 만 온 로그아웃만 닿는다) — 발급자 등록(session_required)을 본다
        this.logger.warn(`SSO id_token has no sid: sub=${claims.sub}`);
      }
      await this.subjects.afterSignIn(userId, { ...meta, created });
      this.logger.log(`SSO sign-in: userId=${userId} sub=${claims.sub}`);
      res.redirect(tx.next);
    } catch (err) {
      this.fail(res, tx, err);
    }
  }

  @Public()
  // 발급자 한 곳이 모든 사람의 로그아웃을 한 IP 로 보낸다 — 넉넉히 두되 끝은 있다.
  // 넘쳐도 발급자는 1 · 2 · 4 … 분 뒤 새 토큰으로 다시 보낸다
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('backchannel-logout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'OIDC back-channel 로그아웃 — 발급자가 서버에서 보낸다',
    description:
      'AUTH_MODE=sso 에서만. application/x-www-form-urlencoded 의 logout_token(§2.6 검증). 쿠키가 없는 서버 간 요청이라 CSRF 밖이다. 그 sid 의 세션을 지우고 200(지울 것이 없어도). 받을 수 없으면 400 {error:"invalid_request"}, 발급자 JWKS 에 닿지 못하면 503',
  })
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['logout_token'],
      properties: { logout_token: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 200, description: '세션을 지웠다(없었어도)' })
  @ApiResponse({ status: 400, description: '{ "error": "invalid_request" }' })
  async backchannelLogout(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');
    const token = (req.body as Record<string, unknown> | undefined)
      ?.logout_token;
    if (typeof token !== 'string' || !token) {
      this.logger.warn('Back-channel logout rejected: no logout_token');
      res.status(400).json({ error: 'invalid_request' });
      return;
    }
    let result: BackchannelLogoutResult;
    try {
      result = await this.backchannel.logout(token);
    } catch (err) {
      if (err instanceof LogoutTokenError) {
        // 토큰은 남기지 않는다 — 어느 규칙에 걸렸는지만
        this.logger.warn(`Back-channel logout rejected: ${err.message}`);
        res.status(400).json({ error: 'invalid_request' });
        return;
      }
      if (err instanceof OidcError) {
        this.logger.warn(`Back-channel logout unavailable: ${err.message}`);
        res.status(503).json({ error: 'temporarily_unavailable' });
        return;
      }
      throw err;
    }
    res.status(200).end();
    await this.backchannel.afterLogout(result);
  }

  private get isProduction(): boolean {
    return this.configService.get('NODE_ENV') === 'production';
  }

  /** 표에 있는 입구만. 아니면 admin(없으면 표의 첫 입구) */
  private knownEntry(entry: unknown): string {
    const keys = this.sso.failureUrls.map(([k]) => k);
    if (typeof entry === 'string' && keys.includes(entry)) return entry;
    return keys.includes('admin') ? 'admin' : keys[0];
  }

  private fail(res: Response, tx: OidcTx, err: unknown) {
    const code: OidcFailureCode =
      err instanceof OidcError
        ? err.code
        : err instanceof AccountSuspendedException
          ? 'account_suspended'
          : err instanceof UnauthorizedException &&
              err.message === 'ACCOUNT_DELETED'
            ? 'account_deleted'
            : 'sso_failed';
    // 메시지는 OidcError 가 이미 걸렀다(비밀 · 이메일 · 응답 본문 없음)
    const reason =
      err instanceof OidcError
        ? err.message
        : ((err as Error)?.name ?? 'unknown');
    this.logger.warn(`SSO ${code}: ${reason}`);
    this.redirectFailure(res, tx, code);
  }

  private redirectFailure(
    res: Response,
    tx: OidcTx | null,
    code: OidcFailureCode,
  ) {
    res.redirect(failurePath(this.sso, tx, code));
  }
}
