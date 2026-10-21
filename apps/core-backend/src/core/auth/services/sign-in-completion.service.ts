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
  /** SSO 로 받은 세션이면 id_token 의 sid — refresh 행에 남겨 back-channel 로그아웃이 찾는다 */
  oidcSid?: string;
  /**
   * 비밀번호로 들어왔으면 맞춰 본 비밀번호의 passwordChangedAt(ms). 세션을 줄 때 잠금 아래에서 견준다 —
   * 그 사이 비밀번호가 바뀌었으면 거절한다 (SignInService.login). 2FA 를 거치면 pre-auth 토큰이 싣고 간다.
   * OAuth · SSO 는 비밀번호가 없어 비운다
   */
  passwordChangedAtMs?: number;
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

/** 로그인 끝에서 내리는 결정 — `decide` 의 결과이자 `complete` 의 결과 (정본 이름) */
export type SignInDecision =
  | { twoFactorRequired: false }
  | { twoFactorRequired: true; availableMethods: AvailableTwoFactorMethods };

/** 기존 이름 — `SignInDecision` 의 별칭 */
export type SignInCompletion = SignInDecision;

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
 * 비밀번호로 들어왔으면 맞춰 본 비밀번호의 passwordChangedAt 을 **반드시** 함께 넘긴다 — `login` 의
 * 마지막 인자(`VerifiedPassword`)와 `createPreAuthToken` 의 세 번째 인자. 빼도 컴파일되지만, 그러면
 * 비밀번호 변경과 겹친 옛 비밀번호의 로그인이 세션을 남긴다.
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
  ): Promise<SignInDecision> {
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

  /**
   * 바깥 계정 서버(AUTH_MODE=sso)가 신원을 확인한 뒤 — 로컬 2FA 를 묻지 않는다(그 서버가 했다).
   * 탈퇴 · 정지 검사는 그대로다. `decide(userId, { twoFactorPassed: true })` 와 같다.
   */
  async completeExternal(
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
   *
   * 부르는 쪽이 지킬 것
   * - `twoFactorPassed: true` 는 그 사용자에 대해 `twoFactorService.authenticate(...)` 가
   *   성공한 **뒤에만** 넘긴다.
   * - 2FA 를 통과한 뒤에도 `signInService.login` 앞에서 `decide(userId, { twoFactorPassed: true })`
   *   를 **다시** 부른다 — pre-auth 5분 사이에 탈퇴·정지가 끼어들 수 있다.
   * - `twoFactorRequired` 면 `login` 을 부르지 않는다. `twoFactorService.createPreAuthToken` 으로
   *   pre-auth 토큰을 내준다.
   * - 비밀번호로 들어왔으면 `login` 에 `VerifiedPassword` 를, `createPreAuthToken` 에 passwordChangedAt 을 넘긴다
   *   (2FA 를 통과한 뒤에는 `authenticate` 가 돌려준 값을 `via: 'two-factor'` 로).
   * - 이 서비스를 쓰는 파생 모듈은 AuthModule 을 import 하되, AuthModule 이 그 모듈을
   *   import 해서는 안 된다(순환).
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
  ): Promise<SignInDecision> {
    const decision = await this.decide(userId, { twoFactorPassed });
    if (decision.twoFactorRequired) {
      setPreAuthCookie(
        res,
        this.twoFactorService.createPreAuthToken(
          userId,
          context.rememberMe,
          context.passwordChangedAtMs,
        ),
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
      context.oidcSid,
      context.passwordChangedAtMs === undefined
        ? undefined
        : {
            changedAtMs: context.passwordChangedAtMs,
            via: twoFactorPassed ? 'two-factor' : 'password',
          },
    );
    setAuthCookies(res, tokens, this.isProduction);
    clearPreAuthCookie(res, this.isProduction);
    return decision;
  }
}
