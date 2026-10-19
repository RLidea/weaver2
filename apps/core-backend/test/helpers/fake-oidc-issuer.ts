/**
 * 시험용 가짜 OIDC 발급자 — `node:http` 하나와 RSA 키. 네트워크 밖으로 나가지 않는다.
 *
 * Jest(단위 · 통합)는 이 클래스를 임의 포트에 띄워 쓰고, e2e 는 `scripts/fake-oidc-issuer.ts` 가
 * 같은 클래스를 정해진 포트에 띄운다. id_token 서명은 `node:crypto` 로 직접 한다(JWS 세 조각) —
 * ESM 의존이 없다.
 *
 * 경로(발급자 주소 `http://127.0.0.1:<port>/oidc` 아래): 안내판 · `/jwks` · `/auth`(e2e 용 폼) ·
 * `/token`(Basic · S256 · redirect_uri, code 1회용) · `/me`(Bearer) · `/session/end` ·
 * `/test/backchannel-logout`(e2e 용 — 서명한 logout_token 을 손님에게 POST 한다).
 *
 * 시험은 `knobs` 로 틀린 값을 끼운다 — 틀린 iss · aud · nonce · 만료 · `alg none`/HS256 · 모르는
 * kid · 키 회전 · 안내판 issuer 다름 · userinfo sub 다름 · token 오류 · 응답 지연.
 * back-channel 로그아웃은 `logoutToken()` 으로 서명한 토큰을 만들고, 틀린 값은 인자로 끼운다.
 */
import {
  KeyObject,
  createHash,
  createHmac,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  sign,
} from 'node:crypto';
import { AddressInfo } from 'node:net';
import {
  IncomingMessage,
  Server,
  ServerResponse,
  createServer,
} from 'node:http';

export interface FakeOidcUser {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

export interface FakeOidcKnobs {
  /** 모든 응답을 이만큼 늦춘다 (시간 제한 시험) */
  delayMs?: number;
  /** 안내판의 issuer 를 바꾼다 */
  discoveryIssuer?: string;
  /** id_token 클레임을 덮는다 — undefined 를 주면 그 클레임을 뺀다 */
  idTokenClaims?: Record<string, unknown>;
  /** id_token 머리를 덮는다 (alg · kid) */
  idTokenHeader?: Record<string, unknown>;
  /** 서명 방법 — 기본 RS256 */
  signWith?: 'RS256' | 'none' | 'HS256';
  /** userinfo 의 sub 를 바꾼다 */
  userinfoSub?: string;
  /** token 끝점이 이 오류로 답한다 */
  tokenError?: { status: number; body: Record<string, unknown> };
}

/** `logoutToken()` 의 인자 — 클레임 · 머리를 덮는다(undefined 면 그 칸을 뺀다) */
export interface FakeLogoutTokenOptions {
  sid?: string;
  sub?: string;
  claims?: Record<string, unknown>;
  header?: Record<string, unknown>;
  signWith?: 'RS256' | 'none' | 'HS256';
}

interface SigningKey {
  kid: string;
  privateKey: KeyObject;
  publicJwk: Record<string, unknown>;
}

interface PendingCode {
  user: FakeOidcUser;
  nonce: string;
  challenge: string;
  redirectUri: string;
  used: boolean;
}

/** 이메일에서 늘 같은 sub(uuid 모양)를 뽑는다 — e2e 에서 같은 사람이 다시 오게 */
export function fakeSubFor(email: string): string {
  const h = createHash('sha256')
    .update(`sub:${email.toLowerCase()}`)
    .digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function b64url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function newKey(): SigningKey {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const kid = randomUUID();
  return {
    kid,
    privateKey,
    publicJwk: {
      ...publicKey.export({ format: 'jwk' }),
      kid,
      alg: 'RS256',
      use: 'sig',
    },
  };
}

export class FakeOidcIssuer {
  readonly clientId: string;
  readonly clientSecret: string;
  knobs: FakeOidcKnobs = {};
  /** 받은 요청 수 — JWKS 다시 받기 시험이 센다 */
  readonly hits = { discovery: 0, jwks: 0, token: 0, userinfo: 0 };

  private server?: Server;
  private base = '';
  private readonly path: string;
  private keys: SigningKey[] = [newKey()];
  private readonly codes = new Map<string, PendingCode>();
  private readonly accessTokens = new Map<string, FakeOidcUser>();
  /** sub → 낸 id_token 의 sid 들(나중 것이 뒤) — back-channel 로그아웃이 고른다 */
  private readonly sids = new Map<string, string[]>();
  private readonly backchannelLogoutUri?: string;

  constructor(
    options: {
      clientId?: string;
      clientSecret?: string;
      path?: string;
      /** `/test/backchannel-logout` 이 logout_token 을 보낼 손님 주소 */
      backchannelLogoutUri?: string;
    } = {},
  ) {
    this.clientId = options.clientId ?? 'test-client';
    this.clientSecret = options.clientSecret ?? 'test-secret';
    this.path = options.path ?? '/oidc';
    this.backchannelLogoutUri = options.backchannelLogoutUri;
  }

  /** 그 sub 에게 마지막으로 낸 id_token 의 sid */
  lastSid(sub: string): string | undefined {
    return this.sids.get(sub)?.at(-1);
  }

  /**
   * back-channel logout_token — 기본은 진짜 발급자와 같은 모양(RS256 · `typ: logout+jwt` · iss · aud ·
   * iat · exp · jti · events, `sid` · `sub` 는 준 것만). 틀린 값은 `claims` · `header` · `signWith` 로.
   */
  logoutToken(options: FakeLogoutTokenOptions = {}): string {
    const now = Math.floor(Date.now() / 1000);
    const claims: Record<string, unknown> = {
      iss: this.issuer,
      aud: this.clientId,
      iat: now,
      exp: now + 120,
      jti: randomUUID(),
      events: { 'http://schemas.openid.net/event/backchannel-logout': {} },
      ...(options.sub !== undefined && { sub: options.sub }),
      ...(options.sid !== undefined && { sid: options.sid }),
    };
    return this.sign(claims, {
      header: { typ: 'logout+jwt', ...options.header },
      overrides: options.claims,
      signWith: options.signWith,
    });
  }

  /** `http://127.0.0.1:<port>/oidc` */
  get issuer(): string {
    return `${this.base}${this.path}`;
  }

  async start(port = 0, host = '127.0.0.1'): Promise<this> {
    this.server = createServer((req, res) => {
      const run = () => {
        this.handle(req, res).catch(() => {
          if (!res.headersSent) res.writeHead(500);
          res.end();
        });
      };
      if (this.knobs.delayMs) setTimeout(run, this.knobs.delayMs);
      else run();
    });
    await new Promise<void>((resolve) =>
      this.server!.listen(port, host, resolve),
    );
    const address = this.server.address() as AddressInfo;
    this.base = `http://${host}:${address.port}`;
    return this;
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    this.server = undefined;
  }

  /** 손잡이 · 세는 수를 처음으로 */
  reset(): void {
    this.knobs = {};
    this.hits.discovery = 0;
    this.hits.jwks = 0;
    this.hits.token = 0;
    this.hits.userinfo = 0;
  }

  /** 새 키로 서명한다. 옛 키도 JWKS 에 남는다 — 모르는 kid 시험에 쓴다 */
  rotateKey(): void {
    this.keys = [newKey(), ...this.keys];
  }

  /**
   * 사람이 accounts 에서 로그인을 마친 것처럼 code 를 만들고, 콜백 주소를 돌려준다.
   * `authorizeUrl` 은 start 가 보낸 Location 그대로다.
   */
  approve(
    authorizeUrl: string,
    user: FakeOidcUser,
    options: { iss?: string | null; error?: string; state?: string } = {},
  ): string {
    const params = new URL(authorizeUrl).searchParams;
    const redirectUri = params.get('redirect_uri') ?? '';
    const callback = new URL(redirectUri);
    callback.searchParams.set(
      'state',
      options.state ?? params.get('state') ?? '',
    );
    if (options.error) {
      callback.searchParams.set('error', options.error);
    } else {
      callback.searchParams.set(
        'code',
        this.issueCode({
          user,
          nonce: params.get('nonce') ?? '',
          challenge: params.get('code_challenge') ?? '',
          redirectUri,
        }),
      );
    }
    if (options.iss !== null) {
      callback.searchParams.set('iss', options.iss ?? this.issuer);
    }
    return callback.toString();
  }

  issueCode(pending: Omit<PendingCode, 'used'>): string {
    const code = randomBytes(24).toString('base64url');
    this.codes.set(code, { ...pending, used: false });
    return code;
  }

  private async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', this.base);
    const route = url.pathname.startsWith(this.path)
      ? url.pathname.slice(this.path.length)
      : null;

    switch (`${req.method} ${route}`) {
      case 'GET /.well-known/openid-configuration':
        this.hits.discovery++;
        return this.json(res, 200, {
          issuer: this.knobs.discoveryIssuer ?? this.issuer,
          authorization_endpoint: `${this.issuer}/auth`,
          token_endpoint: `${this.issuer}/token`,
          userinfo_endpoint: `${this.issuer}/me`,
          jwks_uri: `${this.issuer}/jwks`,
          end_session_endpoint: `${this.issuer}/session/end`,
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          code_challenge_methods_supported: ['S256'],
          token_endpoint_auth_methods_supported: ['client_secret_basic'],
          authorization_response_iss_parameter_supported: true,
          scopes_supported: ['openid', 'email', 'profile'],
        });
      case 'GET /jwks':
        this.hits.jwks++;
        return this.json(res, 200, { keys: this.keys.map((k) => k.publicJwk) });
      case 'GET /auth':
        return this.authorizeForm(url, res);
      case 'POST /auth':
        return this.authorizeSubmit(req, res);
      case 'POST /token':
        this.hits.token++;
        return this.token(req, res);
      case 'GET /me':
        this.hits.userinfo++;
        return this.userinfo(req, res);
      case 'GET /session/end':
        return this.endSession(url, res);
      case 'POST /test/backchannel-logout':
        return this.emitBackchannelLogout(req, res);
      default:
        return this.json(res, 404, { error: 'not_found' });
    }
  }

  private json(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    });
    res.end(JSON.stringify(body));
  }

  private async readForm(req: IncomingMessage): Promise<URLSearchParams> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    return new URLSearchParams(Buffer.concat(chunks).toString());
  }

  /** e2e 의 가짜 로그인 화면 — 이메일 칸 하나와 「email_verified 끄기」 */
  private authorizeForm(url: URL, res: ServerResponse) {
    const hidden = [...url.searchParams]
      .map(
        ([k, v]) =>
          `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`,
      )
      .join('');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>Fake accounts</title></head>
<body><h1>가짜 계정 서버</h1>
<form method="post" action="${escapeHtml(this.issuer)}/auth">${hidden}
<label>이메일 <input name="email" type="email" required></label>
<label><input name="unverified" type="checkbox"> email_verified 끄기</label>
<button type="submit">로그인</button></form></body></html>`);
  }

  private async authorizeSubmit(req: IncomingMessage, res: ServerResponse) {
    const form = await this.readForm(req);
    if (form.get('client_id') !== this.clientId) {
      return this.json(res, 400, { error: 'invalid_client' });
    }
    const email = (form.get('email') ?? '').trim().toLowerCase();
    const authorize = new URL(`${this.issuer}/auth`);
    for (const [k, v] of form) authorize.searchParams.set(k, v);
    const location = this.approve(authorize.toString(), {
      sub: fakeSubFor(email),
      email,
      email_verified: !form.has('unverified'),
      name: email.split('@')[0],
    });
    res.writeHead(302, { location });
    res.end();
  }

  private async token(req: IncomingMessage, res: ServerResponse) {
    if (this.knobs.tokenError) {
      return this.json(
        res,
        this.knobs.tokenError.status,
        this.knobs.tokenError.body,
      );
    }
    const auth = req.headers.authorization ?? '';
    const [id, secret] = auth.startsWith('Basic ')
      ? Buffer.from(auth.slice(6), 'base64')
          .toString()
          .split(':')
          .map((part) => decodeURIComponent(part.replace(/\+/g, ' ')))
      : [];
    if (id !== this.clientId || secret !== this.clientSecret) {
      return this.json(res, 401, { error: 'invalid_client' });
    }
    const form = await this.readForm(req);
    const pending = this.codes.get(form.get('code') ?? '');
    if (
      form.get('grant_type') !== 'authorization_code' ||
      !pending ||
      pending.used
    ) {
      return this.json(res, 400, { error: 'invalid_grant' });
    }
    pending.used = true;
    const verifier = form.get('code_verifier') ?? '';
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    if (
      form.get('redirect_uri') !== pending.redirectUri ||
      challenge !== pending.challenge
    ) {
      return this.json(res, 400, { error: 'invalid_grant' });
    }
    const accessToken = randomBytes(24).toString('base64url');
    this.accessTokens.set(accessToken, pending.user);
    return this.json(res, 200, {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'openid email profile',
      id_token: this.idToken(pending),
    });
  }

  private idToken(pending: PendingCode): string {
    const now = Math.floor(Date.now() / 1000);
    const claims: Record<string, unknown> = {
      iss: this.issuer,
      sub: pending.user.sub,
      aud: this.clientId,
      exp: now + 300,
      iat: now,
      auth_time: now,
      nonce: pending.nonce,
      sid: randomUUID(),
    };
    for (const [k, v] of Object.entries(this.knobs.idTokenClaims ?? {})) {
      if (v === undefined) delete claims[k];
      else claims[k] = v;
    }
    if (typeof claims.sid === 'string') {
      this.sids.set(pending.user.sub, [
        ...(this.sids.get(pending.user.sub) ?? []),
        claims.sid,
      ]);
    }
    return this.sign(claims, {
      header: { typ: 'JWT', ...this.knobs.idTokenHeader },
      signWith: this.knobs.signWith,
    });
  }

  /** JWS 세 조각. `overrides` 의 undefined 는 그 클레임을 뺀다 */
  private sign(
    claims: Record<string, unknown>,
    options: {
      header?: Record<string, unknown>;
      overrides?: Record<string, unknown>;
      signWith?: 'RS256' | 'none' | 'HS256';
    },
  ): string {
    for (const [k, v] of Object.entries(options.overrides ?? {})) {
      if (v === undefined) delete claims[k];
      else claims[k] = v;
    }
    const alg = options.signWith ?? 'RS256';
    const header: Record<string, unknown> = {
      alg,
      ...(alg === 'RS256' ? { kid: this.keys[0].kid } : {}),
      ...options.header,
    };
    for (const [k, v] of Object.entries(header)) {
      if (v === undefined) delete header[k];
    }
    const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
    const signature =
      alg === 'none'
        ? ''
        : alg === 'HS256'
          ? createHmac('sha256', this.clientSecret)
              .update(input)
              .digest('base64url')
          : b64url(
              sign('RSA-SHA256', Buffer.from(input), this.keys[0].privateKey),
            );
    return `${input}.${signature}`;
  }

  private userinfo(req: IncomingMessage, res: ServerResponse) {
    const auth = req.headers.authorization ?? '';
    const user = auth.startsWith('Bearer ')
      ? this.accessTokens.get(auth.slice(7))
      : undefined;
    if (!user) return this.json(res, 401, { error: 'invalid_token' });
    return this.json(res, 200, {
      sub: this.knobs.userinfoSub ?? user.sub,
      email: user.email,
      email_verified: user.email_verified,
      name: user.name,
      preferred_username: user.email.split('@')[0],
    });
  }

  /**
   * e2e 용 — 폼의 `email`(또는 `sub`) 사람에게 마지막으로 낸 sid(`sid` 를 주면 그것)로 logout_token 을
   * 서명해 `backchannelLogoutUri` 에 진짜 발급자처럼 form POST 한다. 손님의 응답 코드를 돌려준다
   */
  private async emitBackchannelLogout(
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    if (!this.backchannelLogoutUri) {
      return this.json(res, 404, { error: 'no_backchannel_logout_uri' });
    }
    const form = await this.readForm(req);
    const email = form.get('email');
    const sub = form.get('sub') ?? (email ? fakeSubFor(email) : '');
    const sid = form.get('sid') ?? this.lastSid(sub);
    if (!sub || !sid) return this.json(res, 400, { error: 'unknown_session' });
    const delivered = await fetch(this.backchannelLogoutUri, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'RLidea-Accounts/1 (fake)',
      },
      body: new URLSearchParams({
        logout_token: this.logoutToken({ sub, sid }),
      }),
      signal: AbortSignal.timeout(2_500),
    });
    return this.json(res, 200, { status: delivered.status });
  }

  /**
   * 진짜 accounts 는 「어디에서 로그아웃할까요?」(「RLidea 서비스 전부 로그아웃」 · 「{client_name}만
   * 로그아웃」)를 묻지만, 가짜는 바로 돌려보낸다 — e2e 는 그 문구에 기대지 않는다
   */
  private endSession(url: URL, res: ServerResponse) {
    const target = url.searchParams.get('post_logout_redirect_uri');
    if (url.searchParams.get('client_id') !== this.clientId || !target) {
      return this.json(res, 400, { error: 'invalid_request' });
    }
    const back = new URL(target);
    const state = url.searchParams.get('state');
    if (state) back.searchParams.set('state', state);
    res.writeHead(302, { location: back.toString() });
    res.end();
  }
}
