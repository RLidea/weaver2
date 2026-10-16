import { readFileSync } from 'fs';
import {
  createPrivateKey,
  createPublicKey,
  JsonWebKey,
  KeyObject,
  sign,
  verify,
} from 'crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OAuthCallbackExtras,
  OAuthProvider,
  OAuthTokens,
  OAuthUserProfile,
} from '../interfaces/oauth-provider.interface';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS_URL = `${APPLE_ISSUER}/auth/keys`;
const APPLE_TOKEN_URL = `${APPLE_ISSUER}/auth/token`;
/** client_secret 수명 — Apple 상한은 6개월, 요청마다 새로 만들므로 짧게 둔다 */
const CLIENT_SECRET_TTL_SEC = 5 * 60;
/** JWKS 캐시 — Apple 이 키를 돌리면 kid 가 없어 한 번 다시 받는다 */
const JWKS_TTL_MS = 60 * 60 * 1000;

interface AppleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
}

interface AppleJwk extends JsonWebKey {
  kid: string;
}

interface AppleIdTokenClaims {
  iss: string;
  aud: string | string[];
  exp: number;
  sub: string;
  email?: string;
  // Apple 은 이 둘을 boolean 으로도, 문자열 "true" 로도 보낸다
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
}

interface AppleUserPayload {
  name?: { firstName?: string; lastName?: string };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function isTrue(value: boolean | string | undefined): boolean {
  return value === true || value === 'true';
}

/**
 * Sign in with Apple.
 *
 * 다른 provider 와 다른 점:
 * - 콜백이 `response_mode=form_post` 로 appleid.apple.com 에서 오는 크로스사이트 POST 다.
 * - 사용자 정보 API 가 없다 — code 교환 응답의 id_token 을 Apple JWKS 로 직접 검증해 읽는다.
 * - client_secret 이 고정 문자열이 아니라 .p8 키로 서명한 ES256 JWT 다.
 * - 이름은 첫 승인 때 콜백 form 의 `user` 로 한 번만 온다.
 */
@Injectable()
export class AppleOAuthProvider implements OAuthProvider {
  readonly name = 'apple';
  readonly usesFormPost = true;
  private readonly logger = new Logger(AppleOAuthProvider.name);
  private jwksCache: { keys: AppleJwk[]; fetchedAt: number } | null = null;

  constructor(private readonly configService: ConfigService) {}

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      response_mode: 'form_post',
      scope: 'name email',
      state,
    });
    return `${APPLE_ISSUER}/auth/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const res = await fetch(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.createClientSecret(),
        redirect_uri: this.callbackUrl,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) {
      const error = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new UnauthorizedException(
        `Apple token exchange failed: ${error.error ?? res.statusText}`,
      );
    }
    const data = (await res.json()) as AppleTokenResponse;
    // refresh_token 은 계정 삭제 때 /auth/revoke 로 철회하려면 꼭 남겨야 한다
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiry: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      idToken: data.id_token,
    };
  }

  async getUserProfile(
    tokens: OAuthTokens,
    extras?: OAuthCallbackExtras,
  ): Promise<OAuthUserProfile> {
    if (!tokens.idToken) {
      throw new UnauthorizedException('Apple did not return an id_token');
    }
    const claims = await this.verifyIdToken(tokens.idToken);
    const name = this.parseName(extras?.user);

    // email 은 첫 승인 뒤 로그인에서 빠질 수 있다. 식별은 sub 로 하고,
    // 이미 연결된 계정이면 email 없이도 로그인된다(OAuthService 가 provider+sub 로 먼저 찾는다).
    const email =
      claims.email && isTrue(claims.email_verified) ? claims.email : '';
    if (isTrue(claims.is_private_email)) {
      this.logger.debug(`Apple private relay email for sub=${claims.sub}`);
    }

    return {
      provider: this.name,
      providerId: claims.sub,
      email,
      displayName: name ?? (email ? email.split('@')[0] : 'Apple User'),
    };
  }

  /** id_token 의 서명(RS256, Apple JWKS)·iss·aud·exp 를 검증한다 */
  async verifyIdToken(idToken: string): Promise<AppleIdTokenClaims> {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed Apple id_token');
    }
    const [headerB64, payloadB64, signatureB64] = parts;
    let header: { alg?: string; kid?: string };
    let claims: AppleIdTokenClaims;
    try {
      header = JSON.parse(
        Buffer.from(headerB64, 'base64url').toString(),
      ) as typeof header;
      claims = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString(),
      ) as AppleIdTokenClaims;
    } catch {
      throw new UnauthorizedException('Malformed Apple id_token');
    }
    if (header.alg !== 'RS256' || !header.kid) {
      throw new UnauthorizedException('Unexpected Apple id_token algorithm');
    }

    const key = await this.getPublicKey(header.kid);
    const valid = verify(
      'RSA-SHA256',
      Buffer.from(`${headerB64}.${payloadB64}`),
      key,
      Buffer.from(signatureB64, 'base64url'),
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid Apple id_token signature');
    }

    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== APPLE_ISSUER) {
      throw new UnauthorizedException('Invalid Apple id_token issuer');
    }
    if (!audiences.includes(this.clientId)) {
      throw new UnauthorizedException('Invalid Apple id_token audience');
    }
    if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('Apple id_token has expired');
    }
    if (!claims.sub) {
      throw new UnauthorizedException('Apple id_token has no subject');
    }
    return claims;
  }

  /** .p8 키로 ES256 client_secret JWT 를 만든다 */
  createClientSecret(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'ES256', kid: this.config('APPLE_KEY_ID') };
    const payload = {
      iss: this.config('APPLE_TEAM_ID'),
      iat: now,
      exp: now + CLIENT_SECRET_TTL_SEC,
      aud: APPLE_ISSUER,
      sub: this.clientId,
    };
    const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
    const signature = sign('sha256', Buffer.from(signingInput), {
      key: this.loadPrivateKey(),
      dsaEncoding: 'ieee-p1363', // JWS 는 DER 이 아니라 r||s 를 쓴다
    });
    return `${signingInput}.${base64url(signature)}`;
  }

  private async getPublicKey(kid: string): Promise<KeyObject> {
    const fresh =
      this.jwksCache && Date.now() - this.jwksCache.fetchedAt < JWKS_TTL_MS;
    let jwk = fresh
      ? this.jwksCache!.keys.find((k) => k.kid === kid)
      : undefined;
    if (!jwk) {
      await this.fetchJwks();
      jwk = this.jwksCache!.keys.find((k) => k.kid === kid);
    }
    if (!jwk) {
      throw new UnauthorizedException('Unknown Apple signing key');
    }
    return createPublicKey({ key: jwk, format: 'jwk' });
  }

  private async fetchJwks(): Promise<void> {
    const res = await fetch(APPLE_KEYS_URL);
    if (!res.ok) {
      throw new UnauthorizedException(
        `Failed to fetch Apple public keys: ${res.statusText}`,
      );
    }
    const data = (await res.json()) as { keys: AppleJwk[] };
    this.jwksCache = { keys: data.keys, fetchedAt: Date.now() };
  }

  private parseName(user: string | undefined): string | undefined {
    if (!user) return undefined;
    try {
      const parsed = JSON.parse(user) as AppleUserPayload;
      const full = [parsed.name?.firstName, parsed.name?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      return full || undefined;
    } catch {
      // 이름은 첫 승인 때 한 번만 온다 — 못 읽으면 다시 받을 길이 없으니 남겨 둔다
      this.logger.warn('Failed to parse Apple user payload');
      return undefined;
    }
  }

  /** APPLE_PRIVATE_KEY_PATH 가 있으면 파일을, 없으면 APPLE_PRIVATE_KEY(\n 이스케이프 허용)를 읽는다 */
  private loadPrivateKey(): KeyObject {
    const path = this.configService.get<string>('APPLE_PRIVATE_KEY_PATH');
    const pem = path
      ? readFileSync(path, 'utf8')
      : this.config('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n');
    return createPrivateKey(pem);
  }

  private get clientId(): string {
    return this.config('APPLE_CLIENT_ID');
  }

  private get callbackUrl(): string {
    return this.config('APPLE_CALLBACK_URL');
  }

  private config(key: string): string {
    return this.configService.get<string>(key) ?? '';
  }
}
