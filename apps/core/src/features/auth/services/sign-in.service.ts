import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Auth } from '@prisma/client';
import { FindUserService } from '../../user/services/find-user.service';
import { FindAuthByEmailQuery } from '../repositories/find-auth-by-email.query';
import { FindAuthByUserIdAndAuthIdQuery } from '../repositories/find-auth-by-user-id-and-auth-id.query';
import { FindAuthByUserIdQuery } from '../repositories/find-auth-by-user-id.query';
import { CreateRefreshTokenCommand } from '../repositories/create-refresh-token.command';
import { FindRefreshTokenQuery } from '../repositories/find-refresh-token.query';
import { DeleteRefreshTokenCommand } from '../repositories/delete-refresh-token.command';

@Injectable()
export class SignInService {
  private readonly logger = new Logger(SignInService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly findUserService: FindUserService,
  ) {}

  async validateUserByEmail(email: string, password: string) {
    const auth = await FindAuthByEmailQuery(this.prisma, email);

    this.logger.debug(
      `validateUserByEmail: Found auth: ${JSON.stringify(auth?.id)}, user: ${JSON.stringify(auth?.user?.id)}`,
    );

    if (!auth || !auth.password)
      throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, auth.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    this.logger.debug(
      `validateUserByEmail: Returning user: ${JSON.stringify(auth.user)}`,
    );
    return { ...auth.user, authId: auth.id };
  }

  async validateUserById(userId: string, authId: string) {
    this.logger.debug(
      `SignInService.validateUserById: Validating userId=${userId}, authId=${authId}`,
    );
    const auth = await FindAuthByUserIdAndAuthIdQuery(
      this.prisma,
      userId,
      authId,
    );
    this.logger.debug(
      `SignInService.validateUserById: Found auth=${JSON.stringify(auth?.id)}, user=${JSON.stringify(auth?.user?.id)}`,
    );
    if (!auth) throw new UnauthorizedException('Invalid credentials');
    return auth.user;
  }

  async login(
    userId: string,
    provider: string,
    rememberMe = false,
    authId?: string,
  ) {
    let auth: Auth | null = null;
    this.logger.debug(
      `Logged in user is: ${userId}, rememberMe: ${rememberMe}`,
    );
    if (authId) {
      auth = await this.prisma.auth.findUnique({ where: { id: authId } });
    } else if (provider === 'email') {
      auth = await FindAuthByUserIdQuery(this.prisma, userId);
    }

    if (!auth) {
      throw new UnauthorizedException(
        'Authentication record not found for user.',
      );
    }

    // Update user's last login time
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: userId, authId: auth.id };
    this.logger.debug(
      `SignInService.login: Signing JWT for userId=${userId}, authId=${auth.id}`,
    );

    // Remember me에 따라 토큰 만료 기간 설정
    const expiryDays = rememberMe ? 30 : 7;
    const tokenExpiry = expiryDays * 24 * 60 * 60 * 1000; // 밀리초

    const generatedRefreshToken = await this.generateRefreshToken(
      auth.id,
      expiryDays,
    );
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: generatedRefreshToken,
      tokenExpiry, // 쿠키 설정용
    };
  }

  async generateRefreshToken(authId: string, expiryDays: number) {
    const token = randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * expiryDays);

    await CreateRefreshTokenCommand(this.prisma, authId, token, expires);

    return token;
  }

  async refresh(refreshToken: string) {
    const stored = await FindRefreshTokenQuery(this.prisma, refreshToken);

    if (!stored || stored.expires < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotation: 기존 토큰 삭제 후 새 토큰 발급
    await DeleteRefreshTokenCommand(this.prisma, refreshToken);

    const remainingMs = stored.expires.getTime() - Date.now();
    const remainingDays = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    const newRefreshToken = await this.generateRefreshToken(stored.auth.id, remainingDays);

    const user = await this.prisma.user.findUnique({
      where: { id: stored.auth.userId },
    });

    return {
      accessToken: this.jwtService.sign({
        sub: user?.id,
        authId: stored.auth.id,
      }),
      refreshToken: newRefreshToken,
      tokenExpiry: remainingMs,
    };
  }
}
