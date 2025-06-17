import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { FindAuthQuery } from './queries/find-auth.query';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const auth = await this.prisma.auth.findUnique({
      where: { email },
      include: { user: true },
    });

    if (!auth || !auth.password)
      throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, auth.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    return auth.user;
  }

  async emailLogin(user: any) {
    const payload = { sub: user.id, email: user.email };
    const auth = await FindAuthQuery(this.prisma, {
      userId: user.id,
      email: user.email,
    });
    if (!auth) throw new UnauthorizedException('Invalid credentials');

    const generatedRefreshToken = await this.generateRefreshToken(auth.id);
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: generatedRefreshToken,
    };
  }

  async generateRefreshToken(authId: string) {
    const token = randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7일

    await this.prisma.refreshToken.create({
      data: { token, authId, expires },
    });

    return token;
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { auth: true },
    });

    if (!stored || stored.expires < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.auth.userId },
    });

    return {
      accessToken: this.jwtService.sign({
        sub: user?.id,
        email: stored.auth.email,
      }),
    };
  }
}
