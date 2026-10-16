import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { isReservedDisplayName } from '@weaver2/common/utility/reserved-names.util';
import { Response } from 'express';
import { OAuthProviderRegistry } from './oauth-provider.registry';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { FindOAuthAccountQuery } from '../repositories/find-oauth-account.query';
import { FindOAuthAccountsByUserIdQuery } from '../repositories/find-oauth-accounts-by-user-id.query';
import { UpsertOAuthAccountCommand } from '../repositories/upsert-oauth-account.command';
import { CreateOAuthUserCommand } from '../repositories/create-oauth-user.command';
import { CreateRefreshTokenCommand } from '../repositories/create-refresh-token.command';
import { DeleteOAuthAccountCommand } from '../repositories/delete-oauth-account.command';
import {
  OAuthCallbackExtras,
  OAuthTokens,
  OAuthUserProfile,
} from './interfaces/oauth-provider.interface';
import { setAuthCookies } from '../utils/auth-cookie.util';
import { AuthProvidersResponseDto } from '../dto/auth-providers-response.dto';
import {
  AUTH_PROVIDER_EXTRAS,
  AuthProviderExtra,
} from './auth-provider-extras';

const OAUTH_DISPLAY_NAME_MAX = 30;
const OAUTH_DISPLAY_NAME_TRIES = 5;

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly providerRegistry: OAuthProviderRegistry,
    @Optional()
    @Inject(AUTH_PROVIDER_EXTRAS)
    private readonly providerExtras: AuthProviderExtra[] = [],
  ) {}

  getAuthorizationUrl(providerName: string): {
    url: string;
    state: string;
    usesFormPost: boolean;
  } {
    const provider = this.providerRegistry.get(providerName);
    const state = randomUUID();
    return {
      url: provider.getAuthorizationUrl(state),
      state,
      usesFormPost: provider.usesFormPost ?? false,
    };
  }

  /** 로그인 화면이 버튼을 서버 설정에 맞춰 그리도록, 켜진 로그인 수단을 알려 준다 */
  /** POST(form_post) 콜백을 받는 provider 인가 — 등록 안 된 provider 도 false */
  acceptsFormPost(providerName: string): boolean {
    return (
      this.providerRegistry.has(providerName) &&
      (this.providerRegistry.get(providerName).usesFormPost ?? false)
    );
  }

  getEnabledProviders(): AuthProvidersResponseDto & Record<string, boolean> {
    const extras: Record<string, boolean> = {};
    for (const extra of this.providerExtras) {
      try {
        Object.assign(extras, extra());
      } catch (error) {
        // 파생 프로젝트의 칸 하나가 깨져도 로그인 화면 전체가 버튼을 잃지 않게 한다
        this.logger.error(
          `AUTH_PROVIDER_EXTRAS entry failed: ${(error as Error).message}`,
        );
      }
    }
    // 파생 프로젝트의 칸은 더하기만 한다 — upstream 칸을 덮어쓰지 못하게 뒤에 펼친다
    return {
      ...extras,
      password: true,
      google: this.isProviderReady('google', 'GOOGLE_CLIENT_ID'),
      kakao: this.isProviderReady('kakao', 'KAKAO_CLIENT_ID'),
      naver: this.isProviderReady('naver', 'NAVER_CLIENT_ID'),
      apple: this.isProviderReady('apple', 'APPLE_CLIENT_ID'),
    };
  }

  /** 등록돼 있고 client id 까지 채워져 있어야 버튼을 눌러 끝까지 갈 수 있다 */
  private isProviderReady(name: string, clientIdKey: string): boolean {
    return (
      this.providerRegistry.has(name) &&
      !!this.configService.get<string>(clientIdKey)
    );
  }

  async handleOAuthCallback(
    providerName: string,
    code: string,
    callbackState: string,
    cookieState: string,
    res: Response,
    extras?: OAuthCallbackExtras,
  ): Promise<void> {
    const failureUrl =
      this.configService.get<string>('OAUTH_FAILURE_REDIRECT_URL') ?? '/';
    const successUrl =
      this.configService.get<string>('OAUTH_SUCCESS_REDIRECT_URL') ?? '/';

    try {
      if (!cookieState || cookieState !== callbackState) {
        throw new UnauthorizedException(
          'OAuth state mismatch. Possible CSRF attack.',
        );
      }

      const provider = this.providerRegistry.get(providerName);
      const tokens = await provider.exchangeCodeForTokens(code);
      const profile = await provider.getUserProfile(tokens, extras);

      this.logger.debug(
        `OAuth profile: provider=${profile.provider}, email=${profile.email}`,
      );

      const { userId } = await this.findOrCreateUser(profile, tokens);

      await this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      });

      const accessToken = this.jwtService.sign({ sub: userId });
      const refreshToken = await this.generateRefreshToken(userId, 7);
      const tokenExpiry = 7 * 24 * 60 * 60 * 1000;

      const isProduction = this.configService.get('NODE_ENV') === 'production';
      setAuthCookies(
        res,
        { accessToken, refreshToken, tokenExpiry },
        isProduction,
      );

      res.redirect(successUrl);
    } catch (error) {
      this.logger.error(
        `OAuth callback failed for provider=${providerName}: ${(error as Error).message}`,
      );

      // 이미 가입된 이메일과 충돌한 경우 프론트에서 메시지 표시할 수 있도록 query 전달
      const target =
        error instanceof ConflictException
          ? `${failureUrl}${failureUrl.includes('?') ? '&' : '?'}error=oauth_email_conflict&provider=${encodeURIComponent(providerName)}`
          : failureUrl;
      res.redirect(target);
    }
  }

  async getMyConnections(userId: string) {
    return FindOAuthAccountsByUserIdQuery(this.prisma, userId);
  }

  async disconnectProvider(userId: string, provider: string): Promise<void> {
    const localCredential = await this.prisma.localCredential.findUnique({
      where: { userId },
    });

    // 비밀번호가 없는 OAuth 전용 계정인 경우 마지막 연동은 해제 불가
    if (!localCredential) {
      const connections = await FindOAuthAccountsByUserIdQuery(
        this.prisma,
        userId,
      );
      if (connections.length <= 1) {
        throw new BadRequestException(
          'Cannot disconnect the last OAuth provider. Set a password first.',
        );
      }
    }

    await DeleteOAuthAccountCommand(this.prisma, userId, provider);
  }

  private async generateRefreshToken(
    userId: string,
    expiryDays: number,
  ): Promise<string> {
    const token = randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * expiryDays);
    await CreateRefreshTokenCommand(this.prisma, userId, token, expires);
    return token;
  }

  private async findOrCreateUser(
    profile: OAuthUserProfile,
    tokens: OAuthTokens,
  ): Promise<{ userId: string }> {
    // 1. 기존 OAuthAccount으로 조회
    const existing = await FindOAuthAccountQuery(
      this.prisma,
      profile.provider,
      profile.providerId,
    );
    if (existing) {
      await UpsertOAuthAccountCommand(this.prisma, {
        userId: existing.userId,
        provider: profile.provider,
        providerId: profile.providerId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: tokens.tokenExpiry,
      });
      return { userId: existing.userId };
    }

    // 신규 가입에는 이메일이 있어야 한다. Apple 은 첫 승인 뒤 email 을 빼고 보낼 수 있고,
    // 그 첫 승인 때만 오는 이름은 다시 받을 수 없으니 식별자를 남겨 추적할 수 있게 한다.
    if (!profile.email) {
      this.logger.warn(
        `OAuth sign-up without email: provider=${profile.provider}, providerId=${profile.providerId}`,
      );
      throw new UnauthorizedException(
        `${profile.provider} did not provide a verified email.`,
      );
    }

    // 2. 같은 이메일 사용자 존재 → 자동 연동을 차단한다.
    // 이메일을 검증하지 않는 OAuth provider 또는 임의 이메일을 청구할 수 있는
    // provider에 대해 자동 연동은 계정 탈취 위험. 사용자가 로그인 후 설정에서
    // 명시적으로 연동하도록 안내한다.
    const existingUser = await FindUserByEmailQuery(this.prisma, profile.email);
    if (existingUser) {
      throw new ConflictException(
        `이미 ${profile.email} 이메일로 가입된 계정이 있습니다. 로그인 후 설정에서 ${profile.provider} 계정을 연동해주세요.`,
      );
    }

    // 3. 신규 사용자 생성
    const username = await this.generateUniqueUsername(
      profile.provider,
      profile.providerId,
    );
    const displayName = await this.generateUniqueDisplayName(
      profile.displayName,
    );
    return CreateOAuthUserCommand(this.prisma, {
      username,
      displayName,
      email: profile.email,
      provider: profile.provider,
      providerId: profile.providerId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.tokenExpiry,
    });
  }

  /**
   * provider 가 준 이름을 displayName(@unique)으로 쓸 수 있게 다듬는다.
   * 겹치면 숫자를 붙인다 — 그대로 넣으면 흔한 이름의 첫 로그인이 P2002 로 실패하고,
   * Apple 은 이름을 첫 승인 때 한 번만 주므로 그 실패는 되돌릴 수 없다.
   */
  private async generateUniqueDisplayName(raw: string): Promise<string> {
    const cleaned = raw
      .replace(/[\p{Cc}\p{Cf}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, OAUTH_DISPLAY_NAME_MAX);
    const base = cleaned && !isReservedDisplayName(cleaned) ? cleaned : 'user';

    for (let n = 1; n <= OAUTH_DISPLAY_NAME_TRIES; n++) {
      const candidate = n === 1 ? base : `${base}${n}`;
      const taken = await this.prisma.user.findFirst({
        where: { displayName: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
    }
    return `${base}_${randomUUID().replace(/-/g, '').slice(0, 6)}`;
  }

  private async generateUniqueUsername(
    provider: string,
    providerId: string,
  ): Promise<string> {
    const base = `${provider}_${providerId.slice(0, 8)}`;
    const existing = await this.prisma.user.findFirst({
      where: { username: base },
    });
    if (!existing) return base;

    const suffix = randomUUID().replace(/-/g, '').slice(0, 6);
    const candidate = `${provider}_${suffix}`;
    const conflict = await this.prisma.user.findFirst({
      where: { username: candidate },
    });
    if (conflict) {
      throw new BadRequestException(
        'Username generation failed. Please try again.',
      );
    }
    return candidate;
  }
}
