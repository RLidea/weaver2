import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { CreateRefreshTokenCommand } from '../repositories/create-refresh-token.command';
import { FindRefreshTokenQuery } from '../repositories/find-refresh-token.query';
import { DeleteRefreshTokenCommand } from '../repositories/delete-refresh-token.command';

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

    if (!user || !user.localCredential || !user.localCredential.password)
      throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, user.localCredential.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    this.logger.debug(
      `validateUserByEmail: Returning user: ${JSON.stringify(user.id)}`,
    );
    return user;
  }

  async login(userId: string, _provider: string, rememberMe = false) {
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
    );
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: generatedRefreshToken,
      tokenExpiry, // 쿠키 설정용
    };
  }

  async generateRefreshToken(userId: string, expiryDays: number) {
    const token = randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * expiryDays);

    await CreateRefreshTokenCommand(this.prisma, userId, token, expires);

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
    const remainingDays = Math.max(
      1,
      Math.ceil(remainingMs / (1000 * 60 * 60 * 24)),
    );
    const newRefreshToken = await this.generateRefreshToken(
      stored.user.id,
      remainingDays,
    );

    return {
      accessToken: this.jwtService.sign({ sub: stored.user.id }),
      refreshToken: newRefreshToken,
      tokenExpiry: remainingMs,
    };
  }
}
