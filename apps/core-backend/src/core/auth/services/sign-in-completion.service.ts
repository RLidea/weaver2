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

/**
 * 정지된 계정. 경로마다 문구를 정규식으로 가리지 않게 타입으로 구분한다(OAuth 실패 안내).
 */
export class AccountSuspendedException extends UnauthorizedException {
  constructor(until: Date) {
    super(`Account is suspended until ${until.toISOString()}.`);
  }
}

export type SignInCompletion =
  | { twoFactorRequired: false }
  | { twoFactorRequired: true; availableMethods: AvailableTwoFactorMethods };

/** `decide` 의 결과 — 쿠키 경로의 `SignInCompletion` 과 같은 모양이다 */
export type SignInDecision = SignInCompletion;

/**
 * 모든 로그인 경로(비밀번호·OAuth·2FA 통과)의 끝. 요소(비밀번호·OAuth 콜백·2FA 코드)가
 * 이미 확인된 뒤에 부른다 — 계정 상태는 그 뒤에야 말한다(이메일만으로 상태가 새지 않게).
 *
 * 1. 탈퇴면 거절
 * 2. 확인된 2FA 수단이 있고 아직 통과 전이면 → pre-auth 쿠키만 주고 세션은 아직 없다
 * 3. 정지면 거절 — 2FA 가 있는 계정은 2FA 를 통과한 **뒤에야** 말한다. 앞에서 말하면
 *    비밀번호만 가진 사람이 정지 사실과 기간을 알게 된다.
 * 4. 세션(IP·UA·rememberMe 반영)
 *
 * 1~3 은 `decide` 에 있고 `complete*` 는 거기에 쿠키 전달(pre-auth·세션)을 얹은 것이다.
 * 토큰을 쿠키가 아닌 응답 본문으로 주는 파생 프로젝트(모바일 등)는 `decide` 를 부른 뒤
 * `signInService.login` 을 직접 부른다. `twoFactorRequired` 일 때 pre-auth 토큰
 * (`twoFactorService.createPreAuthToken`)도 직접 만들어 줘야 한다.
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

  /**
   * 1~3 만 — 계정 상태를 가려 결정만 돌려준다. 쿠키·Response·토큰은 만지지 않는다.
   * 토큰을 응답 본문으로 주는 파생 프로젝트(모바일 등)가 같은 검사를 그대로 쓰는 자리다.
   */
  async decide(
    userId: string,
    { twoFactorPassed }: { twoFactorPassed: boolean },
  ): Promise<SignInDecision> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true, suspendedUntil: true },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('ACCOUNT_DELETED');
    }

    if (!twoFactorPassed) {
      const availableMethods = await this.availableMethods(userId);
      if (availableMethods.totp || availableMethods.email) {
        return { twoFactorRequired: true, availableMethods };
      }
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      throw new AccountSuspendedException(user.suspendedUntil);
    }

    return { twoFactorRequired: false };
  }

  private async run(
    userId: string,
    context: SignInContext,
    res: Response,
    { twoFactorPassed }: { twoFactorPassed: boolean },
  ): Promise<SignInCompletion> {
    const decision = await this.decide(userId, { twoFactorPassed });
    if (decision.twoFactorRequired) {
      setPreAuthCookie(
        res,
        this.twoFactorService.createPreAuthToken(userId, context.rememberMe),
        this.isProduction,
      );
      return decision;
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
    return decision;
  }
}
