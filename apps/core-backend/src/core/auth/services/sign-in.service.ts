import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { CreateRefreshTokenCommand } from '../repositories/create-refresh-token.command';
import { FindRefreshTokenQuery } from '../repositories/find-refresh-token.query';
import { DeleteRefreshTokenCommand } from '../repositories/delete-refresh-token.command';
import { IncrementFailedAttemptsCommand } from '../repositories/increment-failed-attempts.command';
import { ResetFailedAttemptsCommand } from '../repositories/reset-failed-attempts.command';

@Injectable()
export class SignInService {
  private readonly logger = new Logger(SignInService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUserByEmail(email: string, password: string) {
    const user = await FindUserByEmailQuery(this.prisma, email);

    this.logger.debug(
      `validateUserByEmail: Found user: ${JSON.stringify(user?.id)}`,
    );

    if (!user) {
      // 탈퇴한 계정인지 별도 확인
      const deletedUser = await this.prisma.user.findFirst({
        where: { email, deletedAt: { not: null } },
      });
      if (deletedUser) throw new UnauthorizedException('ACCOUNT_DELETED');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.localCredential || !user.localCredential.password)
      throw new UnauthorizedException('Invalid credentials');

    // 정지 계정 체크 (suspendedUntil이 미래 시각이면 정지 상태)
    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      throw new UnauthorizedException(
        `Account is suspended until ${user.suspendedUntil.toISOString()}.`,
      );
    }

    const { localCredential } = user;

    if (
      localCredential.lockedUntil &&
      localCredential.lockedUntil > new Date()
    ) {
      throw new UnauthorizedException(
        'Account is temporarily locked. Please try again later.',
      );
    }

    const match = await bcrypt.compare(password, localCredential.password);
    if (!match) {
      await IncrementFailedAttemptsCommand(this.prisma, user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!localCredential.isVerified) {
      throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
    }

    await ResetFailedAttemptsCommand(this.prisma, user.id);

    this.logger.debug(
      `validateUserByEmail: Returning user: ${JSON.stringify(user.id)}`,
    );
    return user;
  }

  async login(
    userId: string,
    _provider: string,
    rememberMe = false,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.logger.debug(
      `Logged in user is: ${userId}, rememberMe: ${rememberMe}`,
    );

    // Update user's last login time
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: userId };
    this.logger.debug(`SignInService.login: Signing JWT for userId=${userId}`);

    // Remember me에 따라 토큰 만료 기간 설정
    const expiryDays = rememberMe ? 30 : 7;
    const tokenExpiry = expiryDays * 24 * 60 * 60 * 1000; // 밀리초

    const generatedRefreshToken = await this.generateRefreshToken(
      userId,
      expiryDays,
      ipAddress,
      userAgent,
    );
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: generatedRefreshToken,
      tokenExpiry, // 쿠키 설정용
    };
  }

  async generateRefreshToken(
    userId: string,
    expiryDays: number,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const token = randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * expiryDays);

    await CreateRefreshTokenCommand(
      this.prisma,
      userId,
      token,
      expires,
      ipAddress,
      userAgent,
    );

    return token;
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const stored = await FindRefreshTokenQuery(this.prisma, refreshToken);

    if (!stored || stored.expires < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotation: 기존 토큰 삭제 후 새 토큰 발급
    await DeleteRefreshTokenCommand(this.prisma, refreshToken);

    // 사용자가 삭제되었거나 존재하지 않는지 확인
    if (!stored.user || stored.user.deletedAt) {
      this.logger.warn(
        `Refresh attempted for deleted or non-existent user: ${stored.user?.id || 'unknown'}`,
      );
      throw new UnauthorizedException('User account no longer exists');
    }

    const remainingMs = stored.expires.getTime() - Date.now();
    const remainingDays = Math.max(
      1,
      Math.ceil(remainingMs / (1000 * 60 * 60 * 24)),
    );
    const newRefreshToken = await this.generateRefreshToken(
      stored.user.id,
      remainingDays,
      ipAddress,
      userAgent,
    );

    return {
      accessToken: this.jwtService.sign({ sub: stored.user.id }),
      refreshToken: newRefreshToken,
      tokenExpiry: remainingMs,
    };
  }
}
