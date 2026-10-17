import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PrismaService } from '@weaver2/prisma';
import { SignInService } from './sign-in.service';
import { TwoFactorService } from './two-factor.service';
import {
  clearPreAuthCookie,
  setAuthCookies,
  setPreAuthCookie,
} from '../utils/auth-cookie.util';

export interface SignInContext {
  /** 로그인 수단 — 로그·감사용 */
  provider: string;
  rememberMe: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface AvailableTwoFactorMethods {
  totp: boolean;
  email: boolean;
}

export type SignInCompletion =
  | { twoFactorRequired: false }
  | { twoFactorRequired: true; availableMethods: AvailableTwoFactorMethods };

/**
 * 모든 로그인 경로(비밀번호·OAuth·2FA 통과)의 끝. 요소(비밀번호·OAuth 콜백·2FA 코드)가
 * 이미 확인된 뒤에 부른다 — 계정 상태는 그 뒤에야 말한다(이메일만으로 상태가 새지 않게).
 *
 * 1. 탈퇴면 거절, 정지면 거절
 * 2. 확인된 2FA 수단이 있으면 → pre-auth 쿠키만 주고 세션은 아직 없다
 * 3. 없으면 → 세션(IP·UA·rememberMe 반영)
 *
 * 경로마다 검사를 복사하면 경로가 늘 때마다 하나씩 빠진다 — 전에는 OAuth 가 정지·2FA 를,
 * 2FA 통과가 탈퇴·정지를 보지 않았다.
 */
@Injectable()
export class SignInCompletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signInService: SignInService,
    private readonly twoFactorService: TwoFactorService,
    private readonly configService: ConfigService,
  ) {}

  private get isProduction(): boolean {
    return this.configService.get('NODE_ENV') === 'production';
  }

  /** 첫 요소(비밀번호·OAuth)를 통과한 뒤 */
  complete(
    userId: string,
    context: SignInContext,
    res: Response,
  ): Promise<SignInCompletion> {
    return this.run(userId, context, res, { twoFactorPassed: false });
  }

  /**
   * 2FA 를 통과한 뒤 — 1 부터 다시 본다. pre-auth 5분 사이에 탈퇴·정지가 끼어들 수 있다.
   */
  async completeAfterTwoFactor(
    userId: string,
    context: SignInContext,
    res: Response,
  ): Promise<void> {
    await this.run(userId, context, res, { twoFactorPassed: true });
  }

  /** pre-auth 상태에서 고를 수 있는 2FA 수단 — 2FA 화면이 묻는다 */
  async availableMethods(userId: string): Promise<AvailableTwoFactorMethods> {
    const methods = await this.prisma.twoFactorMethod.findMany({
      where: { userId, confirmedAt: { not: null } },
      select: { kind: true },
    });
    return {
      totp: methods.some((m) => m.kind === 'TOTP'),
      email: methods.some((m) => m.kind === 'EMAIL'),
    };
  }

  private async run(
    userId: string,
    context: SignInContext,
    res: Response,
    { twoFactorPassed }: { twoFactorPassed: boolean },
  ): Promise<SignInCompletion> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true, suspendedUntil: true },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('ACCOUNT_DELETED');
    }
    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      throw new UnauthorizedException(
        `Account is suspended until ${user.suspendedUntil.toISOString()}.`,
      );
    }

    if (!twoFactorPassed) {
      const availableMethods = await this.availableMethods(userId);
      if (availableMethods.totp || availableMethods.email) {
        setPreAuthCookie(
          res,
          this.twoFactorService.createPreAuthToken(userId, context.rememberMe),
          this.isProduction,
        );
        return { twoFactorRequired: true, availableMethods };
      }
    }

    const tokens = await this.signInService.login(
      userId,
      context.provider,
      context.rememberMe,
      context.ipAddress,
      context.userAgent,
    );
    setAuthCookies(res, tokens, this.isProduction);
    clearPreAuthCookie(res, this.isProduction);
    return { twoFactorRequired: false };
  }
}
