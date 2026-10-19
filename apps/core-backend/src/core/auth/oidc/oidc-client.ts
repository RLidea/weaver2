import { Inject, Injectable } from '@nestjs/common';
import * as client from 'openid-client';
import {
  AUTH_MODE_CONFIG,
  AuthModeConfig,
  SsoConfig,
  isLoopbackHttp,
} from '../auth-mode';
import { OidcUserClaims } from './oidc-user-hooks';

/**
 * 실패 종류 — 콜백이 실패 주소의 `?error=` 로 싣는 값 그대로다(D13).
 * 화면은 이 값으로 안내를 고른다.
 */
export type OidcFailureCode =
  | 'sso_failed'
  | 'sso_cancelled'
  | 'sso_unavailable'
  | 'sso_email_unverified'
  | 'sso_conflict'
  | 'account_suspended'
  | 'account_deleted';

/** 메시지에는 칸 이름 · 오류 종류만 싣는다 — 비밀 · 이메일 · 응답 본문은 싣지 않는다 */
export class OidcError extends Error {
  constructor(
    readonly code: OidcFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'OidcError';
  }
}

export interface OidcIdTokenClaims {
  sub: string;
  sid?: string;
  auth_time?: number;
}

/**
 * 바깥 발급자와 말하는 포트. 구현은 openid-client(Q1 스파이크 (a))지만, 컨트롤러 · 시험은 이
 * 모양만 본다 — 라이브러리를 바꿔도(예: node:crypto 로) 여기 뒤에서 바뀐다.
 */
export interface OidcClient {
  /** authorize 로 보낼 주소 */
  authorizationUrl(params: {
    state: string;
    nonce: string;
    codeChallenge: string;
    lang: string;
  }): Promise<string>;
  /**
   * 콜백의 code 를 바꾸고 id_token 을 검증한다 — RS256 만, kid 로 고른 JWKS 키, iss · aud(azp) ·
   * exp · iat(시계 허용 60초) · nonce. 검증된 클레임과 userinfo 에 쓸 access 토큰을 돌려준다.
   * access 토큰은 저장하지 않는다(D1).
   */
  exchange(
    callback: URLSearchParams,
    checks: { state: string; nonce: string; codeVerifier: string },
  ): Promise<{ claims: OidcIdTokenClaims; accessToken: string }>;
  /** userinfo — `sub` 가 id_token 의 것과 다르면 거절 */
  userinfo(accessToken: string, expectedSub: string): Promise<OidcUserClaims>;
  /** 발급자의 end_session 주소 — `client_id` · `post_logout_redirect_uri` · `state`, id_token_hint 없음 */
  endSessionUrl(params: { state: string }): Promise<string>;
}

export const OIDC_CLIENT = Symbol('OIDC_CLIENT');

/** 발급자로 가는 모든 요청의 시간 제한(초) */
const REQUEST_TIMEOUT_SEC = 5;
/** id_token 시각 클레임의 시계 허용(초) */
const CLOCK_TOLERANCE_SEC = 60;
/** 안내판 캐시 */
const DISCOVERY_TTL_MS = 60 * 60 * 1000;

const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);

/** 닿지 못했나(시간 초과 · 연결 실패 · 5xx) — 원인 사슬을 따라 본다 */
function isUnavailable(err: unknown): boolean {
  for (
    let e = err as Record<string, unknown> | undefined, i = 0;
    e && i < 6;
    i++
  ) {
    const name = typeof e.name === 'string' ? e.name : '';
    const code = typeof e.code === 'string' ? e.code : '';
    const status = typeof e.status === 'number' ? e.status : 0;
    if (name === 'TimeoutError' || name === 'AbortError') return true;
    if (NETWORK_ERROR_CODES.has(code)) return true;
    if (status >= 500) return true;
    if (name === 'TypeError' && String(e.message).includes('fetch failed')) {
      return true;
    }
    e = e.cause as Record<string, unknown> | undefined;
  }
  return false;
}

/**
 * 라이브러리 오류를 OidcError 로. 메시지에는 단계 · 오류 이름 · 코드 · OAuth `error` 칸만 싣는다 —
 * `error_description` · 응답 본문은 발급자가 쓴 자유 글이라 싣지 않는다.
 */
function toOidcError(stage: string, err: unknown): OidcError {
  if (err instanceof OidcError) return err;
  const e = (err ?? {}) as Record<string, unknown>;
  const parts = [
    typeof e.name === 'string' ? e.name : 'Error',
    typeof e.code === 'string' ? e.code : undefined,
    typeof e.error === 'string' ? `error=${e.error}` : undefined,
    typeof e.status === 'number' ? `status=${e.status}` : undefined,
  ].filter(Boolean);
  return new OidcError(
    isUnavailable(err) ? 'sso_unavailable' : 'sso_failed',
    `OIDC ${stage} failed: ${parts.join(' ')}`,
  );
}

@Injectable()
export class OpenIdOidcClient implements OidcClient {
  private readonly sso: SsoConfig;
  private discovered?: { at: number; config: Promise<client.Configuration> };

  constructor(@Inject(AUTH_MODE_CONFIG) authMode: AuthModeConfig) {
    if (authMode.mode !== 'sso') {
      throw new Error('OpenIdOidcClient needs AUTH_MODE=sso');
    }
    this.sso = authMode.sso;
  }

  /**
   * 안내판은 처음 쓸 때 받아 1시간 둔다. 실패하면 두지 않는다 — 다음 로그인이 다시 받는다.
   * 부팅 때 받지 않으므로 발급자가 죽어 있어도 앱은 뜬다(로그인만 `sso_unavailable`).
   * 안내판의 `issuer` 가 설정값과 다르면 openid-client 가 거절한다.
   */
  private configuration(): Promise<client.Configuration> {
    const now = Date.now();
    if (this.discovered && now - this.discovered.at < DISCOVERY_TTL_MS) {
      return this.discovered.config;
    }
    const execute = [client.enableNonRepudiationChecks];
    // 평문 http 는 같은 기계의 발급자(시험 · e2e 의 가짜, 로컬 accounts)에만
    if (isLoopbackHttp(this.sso.issuer))
      execute.push(client.allowInsecureRequests);
    const config = client
      .discovery(
        new URL(this.sso.issuer),
        this.sso.clientId,
        {
          id_token_signed_response_alg: 'RS256',
          [client.clockTolerance]: CLOCK_TOLERANCE_SEC,
        },
        client.ClientSecretBasic(this.sso.clientSecret),
        { timeout: REQUEST_TIMEOUT_SEC, execute },
      )
      .catch((err: unknown) => {
        if (this.discovered?.config === config) this.discovered = undefined;
        throw toOidcError('discovery', err);
      });
    this.discovered = { at: now, config };
    return config;
  }

  async authorizationUrl(params: {
    state: string;
    nonce: string;
    codeChallenge: string;
    lang: string;
  }): Promise<string> {
    const config = await this.configuration();
    return client
      .buildAuthorizationUrl(config, {
        redirect_uri: this.sso.redirectUri,
        response_type: 'code',
        // offline_access 는 청하지 않는다 — 우리 세션은 우리가 갖는다(D1)
        scope: 'openid email profile',
        state: params.state,
        nonce: params.nonce,
        code_challenge: params.codeChallenge,
        code_challenge_method: 'S256',
        ui_locales: params.lang,
      })
      .toString();
  }

  async exchange(
    callback: URLSearchParams,
    checks: { state: string; nonce: string; codeVerifier: string },
  ): Promise<{ claims: OidcIdTokenClaims; accessToken: string }> {
    const config = await this.configuration();
    const currentUrl = new URL(this.sso.redirectUri);
    for (const [k, v] of callback) currentUrl.searchParams.append(k, v);
    try {
      const tokens = await client.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: checks.codeVerifier,
        expectedState: checks.state,
        expectedNonce: checks.nonce,
        idTokenExpected: true,
      });
      const claims = tokens.claims();
      if (!claims?.sub) {
        throw new OidcError('sso_failed', 'OIDC exchange failed: no id_token');
      }
      return {
        claims: {
          sub: claims.sub,
          sid: typeof claims.sid === 'string' ? claims.sid : undefined,
          auth_time: claims.auth_time,
        },
        accessToken: tokens.access_token,
      };
    } catch (err) {
      throw toOidcError('exchange', err);
    }
  }

  async userinfo(
    accessToken: string,
    expectedSub: string,
  ): Promise<OidcUserClaims> {
    const config = await this.configuration();
    try {
      const info = await client.fetchUserInfo(config, accessToken, expectedSub);
      return {
        sub: info.sub,
        email: typeof info.email === 'string' ? info.email : undefined,
        emailVerified: info.email_verified === true,
        name: typeof info.name === 'string' ? info.name : undefined,
        preferredUsername:
          typeof info.preferred_username === 'string'
            ? info.preferred_username
            : undefined,
      };
    } catch (err) {
      throw toOidcError('userinfo', err);
    }
  }

  async endSessionUrl(params: { state: string }): Promise<string> {
    const config = await this.configuration();
    try {
      // id_token_hint 는 보내지 않는다 — 발급자는 client_id 로 손님을 찾고 post_logout 을 대조한다(D8)
      return client
        .buildEndSessionUrl(config, {
          client_id: this.sso.clientId,
          post_logout_redirect_uri: this.sso.postLogoutRedirectUri,
          state: params.state,
        })
        .toString();
    } catch (err) {
      throw toOidcError('end_session', err);
    }
  }
}
