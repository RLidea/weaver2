import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CookieOptions, Request, Response } from 'express';
import { hkdfSync } from 'crypto';
import { TOKEN_AUDIENCE } from '../strategy/token-audience';
import { AUTH_MODE_CONFIG, AuthModeConfig } from '../auth-mode';

/** start 에서 정해 callback 까지 들고 가는 것 */
export interface OidcTx {
  state: string;
  nonce: string;
  /** PKCE code_verifier */
  verifier: string;
  /** 로그인 뒤 갈 곳 — 이미 같은 출처의 경로로 걸렀다 */
  next: string;
  lang: string;
  entry: string;
}

const TX_TTL_SEC = 10 * 60;

/**
 * tx 서명 키. 새 환경 변수를 만들지 않고 JWT_SECRET 에서 용도별로 뽑는다(one-time-code 와 같은 방법)
 * — 같은 비밀이 액세스 토큰과 tx 의 키로 함께 쓰이지 않는다. JWT_SECRET 을 바꾸면 진행 중인
 * 로그인(최대 10분)만 끊긴다.
 */
export function deriveTxKey(jwtSecret: string): Buffer {
  return Buffer.from(
    hkdfSync('sha256', jwtSecret, '', 'weaver2/oidc-tx/v1', 32),
  );
}

/**
 * SSO 로그인 진행 쿠키. state · nonce · verifier · next · lang · entry 를 HS256 JWT(aud `oidc-tx`,
 * 10분)로 서명해 담는다 — 서버에 상태를 두지 않는다.
 *
 * 이름은 콜백(redirect URI)이 https 면 `__Host-oidc_tx`(Secure · `path=/` · Domain 없음): 형제
 * 서브도메인(staging)이 같은 이름의 쿠키를 심어 섞을 틈을 막는다. http 콜백(개발 · e2e)은 Secure 를
 * 못 걸어 `oidc_tx` 다. NODE_ENV 가 아니라 콜백의 scheme 을 본다 — NODE_ENV 를 잘못 둔 https
 * 서버에서도 Secure 가 빠지지 않게(보안 검토 M1).
 * `SameSite=Lax` — 콜백은 발급자에서 오는 최상위 GET 이라 실린다.
 */
@Injectable()
export class OidcTransaction {
  private readonly key: Buffer;
  private readonly secure: boolean;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
    @Inject(AUTH_MODE_CONFIG) authMode: AuthModeConfig,
  ) {
    this.key = deriveTxKey(configService.getOrThrow<string>('JWT_SECRET'));
    this.secure =
      authMode.mode === 'sso' &&
      new URL(authMode.sso.redirectUri).protocol === 'https:';
  }

  get cookieName(): string {
    return this.secure ? '__Host-oidc_tx' : 'oidc_tx';
  }

  private get cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: '/',
    };
  }

  write(res: Response, tx: OidcTx): void {
    const token = this.jwtService.sign(
      { ...tx },
      {
        secret: this.key,
        algorithm: 'HS256',
        audience: TOKEN_AUDIENCE.OIDC_TX,
        expiresIn: TX_TTL_SEC,
      },
    );
    res.cookie(this.cookieName, token, {
      ...this.cookieOptions,
      maxAge: TX_TTL_SEC * 1000,
    });
  }

  /** 서명 · 만료 · aud 가 맞을 때만. 아니면 null */
  read(req: Request): OidcTx | null {
    const raw = (req.cookies as Record<string, unknown> | undefined)?.[
      this.cookieName
    ];
    if (typeof raw !== 'string') return null;
    try {
      const tx = this.jwtService.verify<OidcTx>(raw, {
        secret: this.key,
        algorithms: ['HS256'],
        audience: TOKEN_AUDIENCE.OIDC_TX,
      });
      const fields = ['state', 'nonce', 'verifier', 'next', 'lang', 'entry'];
      return fields.every(
        (f) =>
          typeof (tx as unknown as Record<string, unknown>)[f] === 'string',
      )
        ? tx
        : null;
    } catch {
      return null;
    }
  }

  clear(res: Response): void {
    res.clearCookie(this.cookieName, this.cookieOptions);
  }
}
