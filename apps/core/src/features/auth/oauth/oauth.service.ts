import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { OAuthProviderRegistry } from './oauth-provider.registry';
import { FindAuthByEmailQuery } from '../repositories/find-auth-by-email.query';
import { FindOAuthConnectionQuery } from '../repositories/find-oauth-connection.query';
import { UpsertOAuthConnectionCommand } from '../repositories/upsert-oauth-connection.command';
import { CreateOAuthUserCommand } from '../repositories/create-oauth-user.command';
import { CreateRefreshTokenCommand } from '../repositories/create-refresh-token.command';
import {
  OAuthTokens,
  OAuthUserProfile,
} from './interfaces/oauth-provider.interface';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly providerRegistry: OAuthProviderRegistry,
  ) {}

  getAuthorizationUrl(providerName: string): { url: string; state: string } {
    const provider = this.providerRegistry.get(providerName);
    const state = randomUUID();
    return { url: provider.getAuthorizationUrl(state), state };
  }

  async handleOAuthCallback(
    providerName: string,
    code: string,
    callbackState: string,
    cookieState: string,
    res: Response,
  ): Promise<void> {
    const failureUrl =
      this.configService.get<string>('OAUTH_FAILURE_REDIRECT_URL') ?? '/';
    const successUrl =
      this.configService.get<string>('OAUTH_SUCCESS_REDIRECT_URL') ?? '/';

    try {
      if (!cookieState || cookieState !== callbackState) {
        throw new UnauthorizedException('OAuth state mismatch. Possible CSRF attack.');
      }

      const provider = this.providerRegistry.get(providerName);
      const tokens = await provider.exchangeCodeForTokens(code);
      const profile = await provider.getUserProfile(tokens.accessToken);

      this.logger.debug(
        `OAuth profile: provider=${profile.provider}, email=${profile.email}`,
      );

      const { userId, authId } = await this.findOrCreateUser(profile, tokens);

      await this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      });

      const accessToken = this.jwtService.sign({ sub: userId, authId });
      const refreshToken = await this.generateRefreshToken(authId, 7);
      const tokenExpiry = 7 * 24 * 60 * 60 * 1000;

      const isProduction = this.configService.get('NODE_ENV') === 'production';
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: isProduction,
        path: '/',
        maxAge: 15 * 60 * 1000,
      });
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        path: '/',
        maxAge: tokenExpiry,
      });

      res.redirect(successUrl);
    } catch (error) {
      this.logger.error(
        `OAuth callback failed for provider=${providerName}: ${(error as Error).message}`,
      );
      res.redirect(failureUrl);
    }
  }

  private async generateRefreshToken(
    authId: string,
    expiryDays: number,
  ): Promise<string> {
    const token = randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * expiryDays);
    await CreateRefreshTokenCommand(this.prisma, authId, token, expires);
    return token;
  }

  private async findOrCreateUser(
    profile: OAuthUserProfile,
    tokens: OAuthTokens,
  ): Promise<{ userId: string; authId: string }> {
    // 1. 기존 OAuthConnection으로 조회
    const existing = await FindOAuthConnectionQuery(
      this.prisma,
      profile.provider,
      profile.providerId,
    );
    if (existing) {
      await UpsertOAuthConnectionCommand(this.prisma, {
        authId: existing.authId,
        provider: profile.provider,
        providerId: profile.providerId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: tokens.tokenExpiry,
      });
      return { userId: existing.auth.userId, authId: existing.authId };
    }

    // 2. 같은 이메일 Auth 조회 → 자동 연동
    const existingAuth = await FindAuthByEmailQuery(this.prisma, profile.email);
    if (existingAuth) {
      await UpsertOAuthConnectionCommand(this.prisma, {
        authId: existingAuth.id,
        provider: profile.provider,
        providerId: profile.providerId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: tokens.tokenExpiry,
      });
      return { userId: existingAuth.userId, authId: existingAuth.id };
    }

    // 3. 신규 사용자 생성
    const username = await this.generateUniqueUsername(
      profile.provider,
      profile.providerId,
    );
    return CreateOAuthUserCommand(this.prisma, {
      username,
      displayName: profile.displayName,
      email: profile.email,
      provider: profile.provider,
      providerId: profile.providerId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.tokenExpiry,
    });
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
