import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService, TwoFactorMethod } from '@weaver2/prisma';
// otplib와 qrcode는 CJS 형태라 ESM 친화 import는 default로만 가능.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const otplibLib = require('otplib') as typeof import('otplib');
const {
  generateSecret: otpGenerateSecret,
  generateURI: otpGenerateURI,
  verify: otpVerify,
} = otplibLib;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const qrcode = require('qrcode') as typeof import('qrcode');
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import {
  ACCOUNT_LOCKED_MESSAGE,
  ReserveAuthAttemptCommand,
} from '../repositories/reserve-auth-attempt.command';
import { ResetAuthAttemptsCommand } from '../repositories/reset-auth-attempts.command';
import { FindTwoFactorMethodsQuery } from '../repositories/find-two-factor-methods.query';
import { StartTotpSetupCommand } from '../repositories/start-totp-setup.command';
import { ConfirmTotpSetupCommand } from '../repositories/confirm-totp-setup.command';
import { RecordTotpTimeStepCommand } from '../repositories/record-totp-time-step.command';
import { EnableEmailTwoFactorCommand } from '../repositories/enable-email-two-factor.command';
import { DeleteTwoFactorMethodIfOtherRemainsCommand } from '../repositories/delete-two-factor-method-if-other-remains.command';
import { TOKEN_AUDIENCE } from '../strategy/token-audience';
import { OneTimeCodeService } from '../one-time-code/one-time-code.service';
import { CodePurpose } from '../one-time-code/one-time-code.constants';
import { encryptSecret, decryptSecret } from '../utils/auth-crypto.util';

const APP_NAME = 'Weaver2';

interface PreAuthPayload {
  sub: string;
  rememberMe: boolean;
  /** 발급 시각(ms) — 이 뒤에 로그인이 끝났으면(lastLoginAt) 이미 쓴 토큰이다 */
  issuedAtMs?: number;
}

/**
 * 2FA 수단은 사람(User)에 붙는다 — two_factor_methods. 로그인 수단(비밀번호·OAuth)과
 * 무관해서, 비밀번호가 없는 OAuth 사용자도 켤 수 있다.
 */
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailBusinessService: EmailBusinessService,
    private readonly oneTimeCodeService: OneTimeCodeService,
  ) {}

  // ─────────────────────────────────────────
  // Pre-auth Token
  // ─────────────────────────────────────────

  createPreAuthToken(userId: string, rememberMe = false): string {
    const payload: PreAuthPayload = {
      sub: userId,
      rememberMe,
      issuedAtMs: Date.now(),
    };
    // 종류는 aud 로 적는다 — 액세스 토큰 자리에 쓰이면 검증에서 거절된다
    return this.jwtService.sign(payload, {
      expiresIn: '5m',
      audience: TOKEN_AUDIENCE.PRE_AUTH,
    });
  }

  verifyPreAuthToken(token: string): {
    userId: string;
    rememberMe: boolean;
    issuedAtMs?: number;
  } {
    try {
      // 액세스 토큰을 pre-auth 자리에 넣어도 aud 가 달라 거절된다
      const payload = this.jwtService.verify<PreAuthPayload>(token, {
        audience: TOKEN_AUDIENCE.PRE_AUTH,
      });
      return {
        userId: payload.sub,
        rememberMe: payload.rememberMe ?? false,
        issuedAtMs: payload.issuedAtMs,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired pre-auth token');
    }
  }

  /**
   * pre-auth 토큰은 한 번 로그인을 끝내면 다시 쓰지 못한다. 2FA 를 통과하면 완료 서비스가 lastLoginAt 을
   * 갱신하므로, 그보다 먼저 발급된 토큰은 이미 쓴 것이다 — 5분 안에 같은 토큰과 새 코드로 세션을 또
   * 받는 길을 닫는다. 표가 따로 필요 없다. 발급 시각이 없는 옛 토큰(배포 전 발급)은 수명(5분) 안에서만 통한다.
   */
  private async assertPreAuthUnused(
    userId: string,
    issuedAtMs: number | undefined,
  ): Promise<void> {
    if (issuedAtMs === undefined) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginAt: true },
    });
    if (user?.lastLoginAt && user.lastLoginAt.getTime() >= issuedAtMs) {
      throw new UnauthorizedException('Invalid or expired pre-auth token');
    }
  }

  // ─────────────────────────────────────────
  // TOTP Setup
  // ─────────────────────────────────────────

  async generateTotpSetup(userId: string) {
    const { confirmedTotp } = await FindTwoFactorMethodsQuery(
      this.prisma,
      userId,
    );
    // 확인된 TOTP 는 등록 경로가 절대 덮지 않는다. 덮으면 「등록 시작」 한 번으로 2FA 가
    // 꺼진다 — 끄는 길은 코드를 요구하는 해제(DELETE /2fa/totp) 하나뿐이어야 한다.
    if (confirmedTotp) throw this.totpAlreadyEnabled();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const secret = otpGenerateSecret();
    const otpAuthUrl = otpGenerateURI({
      label: user.email,
      issuer: APP_NAME,
      secret,
    });
    const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

    // 원문 secret은 QR/응답으로만 전달하고, DB에는 암호화해 저장한다.
    // 위 확인과 이 쓰기 사이에 등록이 확인될 수 있으니 쓰기도 「확인된 것이 없을 때만」이다.
    const started = await StartTotpSetupCommand(
      this.prisma,
      userId,
      encryptSecret(secret),
    );
    if (!started) throw this.totpAlreadyEnabled();

    return { secret, qrCodeUrl: qrCodeDataUrl, otpAuthUrl };
  }

  async confirmTotpSetup(userId: string, code: string): Promise<void> {
    const { totp } = await FindTwoFactorMethodsQuery(this.prisma, userId);
    if (totp?.confirmedAt) throw this.totpAlreadyEnabled();
    if (!totp?.secretEncrypted) {
      throw new BadRequestException('TOTP setup not initiated');
    }

    if (!(await this.reserveSecondFactor(userId))) {
      throw new BadRequestException(ACCOUNT_LOCKED_MESSAGE);
    }
    const timeStep = await this.verifyTotp(totp, code);
    if (timeStep === null) throw new BadRequestException('Invalid TOTP code');

    const confirmed = await ConfirmTotpSetupCommand(
      this.prisma,
      userId,
      totp.secretEncrypted,
      timeStep,
    );
    if (!confirmed) {
      // 같은 코드로 동시에 확인해 진 쪽이면 이미 켜져 있다 — 「다시 시작됐다」는 틀린 안내다
      const { confirmedTotp } = await FindTwoFactorMethodsQuery(
        this.prisma,
        userId,
      );
      if (confirmedTotp) throw this.totpAlreadyEnabled();
      throw new ConflictException(
        'TOTP setup was restarted. Scan the new QR code and try again.',
      );
    }
    await ResetAuthAttemptsCommand(this.prisma, userId, 'SECOND_FACTOR');
    this.logger.log(`TOTP enabled for userId=${userId}`);
  }

  private totpAlreadyEnabled(): ConflictException {
    return new ConflictException(
      'TOTP is already enabled. Disable it before setting up again.',
    );
  }

  // ─────────────────────────────────────────
  // Email OTP Setup
  // ─────────────────────────────────────────

  async initiateEmailOtpSetup(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.sendCode(user, 'TWO_FACTOR_SETUP');
    this.logger.log(`Email OTP setup code sent to userId=${userId}`);
  }

  async confirmEmailOtpSetup(userId: string, code: string): Promise<void> {
    // 틀림·만료·없음·시도 소진을 가르지 않는다 — 어느 쪽이든 새 코드를 받으면 된다
    const verified = await this.oneTimeCodeService.verifyCode(
      userId,
      'TWO_FACTOR_SETUP',
      code,
    );
    if (!verified) {
      throw new BadRequestException(
        'Invalid or expired Email OTP code. Please request a new code.',
      );
    }

    await EnableEmailTwoFactorCommand(this.prisma, userId);
    this.logger.log(`Email OTP enabled for userId=${userId}`);
  }

  // ─────────────────────────────────────────
  // Login 2FA
  // ─────────────────────────────────────────

  async sendEmailOtp(userId: string): Promise<void> {
    // pre-auth 5분 사이에 탈퇴했으면 코드를 보내지 않는다
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new BadRequestException('User not found');

    const { email } = await FindTwoFactorMethodsQuery(this.prisma, userId);
    if (!email) {
      throw new BadRequestException(
        'Email OTP is not enabled for this account',
      );
    }

    await this.sendCode(user, 'TWO_FACTOR_LOGIN');
    this.logger.log(`Email OTP login code sent to userId=${userId}`);
  }

  async authenticate(
    preAuthToken: string,
    method: 'totp' | 'email',
    code: string,
  ): Promise<{ userId: string; rememberMe: boolean }> {
    const { userId, rememberMe, issuedAtMs } =
      this.verifyPreAuthToken(preAuthToken);
    await this.assertPreAuthUnused(userId, issuedAtMs);
    const methods = await FindTwoFactorMethodsQuery(this.prisma, userId);

    // 2FA 시도는 SECOND_FACTOR 로 센다. IP 별 throttle 만으로는 IP 를 바꿔 가며 6자리
    // 코드를 대입하는 것을 막지 못한다. 코드를 보기 전에 시도를 원자적으로 잡는다.
    if (!(await this.reserveSecondFactor(userId))) {
      throw new UnauthorizedException(ACCOUNT_LOCKED_MESSAGE);
    }

    if (method === 'totp') {
      if (!methods.confirmedTotp) {
        throw new BadRequestException('TOTP is not enabled for this account');
      }
      if (!(await this.consumeTotp(userId, methods.confirmedTotp, code))) {
        throw new UnauthorizedException('Invalid TOTP code');
      }
    } else {
      if (!methods.email) {
        throw new BadRequestException(
          'Email OTP is not enabled for this account',
        );
      }
      // 코드별 한도(5번)와 위의 계정 잠금이 겹으로 막는다
      const verified = await this.oneTimeCodeService.verifyCode(
        userId,
        'TWO_FACTOR_LOGIN',
        code,
      );
      if (!verified) {
        throw new UnauthorizedException(
          'Invalid or expired Email OTP code. Please request a new code.',
        );
      }
    }

    await ResetAuthAttemptsCommand(this.prisma, userId, 'SECOND_FACTOR');
    this.logger.log(`2FA authenticated via ${method} for userId=${userId}`);
    return { userId, rememberMe };
  }

  // ─────────────────────────────────────────
  // Step-up — 로그인한 사용자가 민감한 동작 전에 다시 증명
  // ─────────────────────────────────────────

  /**
   * 2FA 해제 같은 민감한 동작 전에 메일로 코드를 보낸다. 인증 앱 코드를 쓸 수 없는
   * 사용자도 해제할 수 있게 한다(전에는 로그인 코드를 받을 길이 없어 사실상 TOTP 뿐이었다).
   */
  async sendStepUpCode(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.sendCode(user, 'STEP_UP');
    this.logger.log(`Step-up code sent to userId=${userId}`);
  }

  // ─────────────────────────────────────────
  // Disable 2FA
  // ─────────────────────────────────────────

  async disableTotp(userId: string, code: string): Promise<void> {
    const methods = await FindTwoFactorMethodsQuery(this.prisma, userId);
    if (!methods.confirmedTotp)
      throw new BadRequestException('TOTP is not enabled');

    if (!methods.email) {
      throw new BadRequestException(
        'Cannot disable TOTP: it is the only active 2FA method. Enable Email OTP first.',
      );
    }

    await this.verifyAnyMethodCode(userId, code, methods.confirmedTotp);
    await this.deleteIfOtherRemains(userId, 'TOTP');
    this.logger.log(`TOTP disabled for userId=${userId}`);
  }

  async disableEmailOtp(userId: string, code: string): Promise<void> {
    const methods = await FindTwoFactorMethodsQuery(this.prisma, userId);
    if (!methods.email)
      throw new BadRequestException('Email OTP is not enabled');

    if (!methods.confirmedTotp) {
      throw new BadRequestException(
        'Cannot disable Email OTP: it is the only active 2FA method. Enable TOTP first.',
      );
    }

    await this.verifyAnyMethodCode(userId, code, methods.confirmedTotp);
    await this.deleteIfOtherRemains(userId, 'EMAIL');
    // 살아 있던 로그인·등록 코드는 이제 쓸 데가 없다
    await this.prisma.oneTimeCode.deleteMany({
      where: {
        userId,
        purpose: { in: ['TWO_FACTOR_LOGIN', 'TWO_FACTOR_SETUP'] },
      },
    });
    this.logger.log(`Email OTP disabled for userId=${userId}`);
  }

  // ─────────────────────────────────────────
  // Status
  // ─────────────────────────────────────────

  async getStatus(userId: string) {
    const { confirmedTotp, email } = await FindTwoFactorMethodsQuery(
      this.prisma,
      userId,
    );
    return {
      totpEnabled: !!confirmedTotp,
      emailOtpEnabled: !!email,
    };
  }

  // ─────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────

  private async sendCode(
    user: { id: string; email: string },
    purpose: CodePurpose,
  ): Promise<void> {
    const code = await this.oneTimeCodeService.issueCode(user.id, purpose);
    if (!code) {
      throw new HttpException(
        'A code was sent recently. Use it or try again in a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.oneTimeCodeService.deliverOrRevoke(user.id, purpose, () =>
      this.emailBusinessService.sendTwoFactorCodeEmail(
        user.email,
        code,
        user.id,
      ),
    );
  }

  /**
   * TOTP 코드를 확인해 맞으면 그 시간 단위를, 아니면 null 을 돌려준다.
   * 이미 쓴 단위(lastUsedTimeStep 이하)는 맞아도 null — 재사용 차단.
   */
  private async verifyTotp(
    method: Pick<TwoFactorMethod, 'secretEncrypted' | 'lastUsedTimeStep'>,
    code: string,
  ): Promise<number | null> {
    if (!method.secretEncrypted) return null;
    try {
      const result = await otpVerify({
        token: code,
        secret: decryptSecret(method.secretEncrypted),
        ...(method.lastUsedTimeStep !== null && {
          afterTimeStep: method.lastUsedTimeStep,
        }),
      });
      // 함수형 verify 의 결과 타입은 HOTP 와 합쳐져 있다 — TOTP 결과만 timeStep 을 갖는다
      return result.valid && 'timeStep' in result ? result.timeStep : null;
    } catch (err) {
      // 기기 시계가 앞서 있어 저장된 단위가 지금 허용 범위보다 크면 otplib 가 던진다.
      // 그 오류 클래스는 export 되지 않아 이름으로 가린다 — 틀린 코드와 같게 다룬다.
      if (
        err instanceof Error &&
        err.name === 'AfterTimeStepRangeExceededError'
      ) {
        return null;
      }
      throw err;
    }
  }

  /**
   * 확인된 TOTP 코드를 확인하고 그 시간 단위를 남긴다. 같은 코드로 동시에 두 번 와도
   * 단위를 남기는 조건부 UPDATE 가 하나만 통과시킨다.
   */
  private async consumeTotp(
    userId: string,
    method: TwoFactorMethod,
    code: string,
  ): Promise<boolean> {
    const timeStep = await this.verifyTotp(method, code);
    if (timeStep === null) return false;
    return RecordTotpTimeStepCommand(this.prisma, userId, timeStep);
  }

  /**
   * 해제 같은 민감한 동작 전의 재증명 — 인증 앱 코드 또는 메일로 받은 STEP_UP 코드.
   * 해제 경로의 TOTP 오답도 로그인 2FA 와 같은 SECOND_FACTOR 로 센다(안 세면 여기가
   * 잠금 없는 대입 창구가 된다).
   */
  private async verifyAnyMethodCode(
    userId: string,
    code: string,
    confirmedTotp: TwoFactorMethod | null,
  ): Promise<void> {
    if (!(await this.reserveSecondFactor(userId))) {
      throw new UnauthorizedException(ACCOUNT_LOCKED_MESSAGE);
    }

    // 인증 앱 코드로 맞으면 그것으로 끝이다 — 이미 쓴 단위라 거절돼도 STEP_UP 으로 넘기지
    // 않는다(넘기면 그 코드의 시도 5번 중 하나를 까먹는다). 인증 앱 코드가 아닐 때만
    // 로그인한 사용자가 메일로 받은 STEP_UP 코드로 본다.
    const timeStep = confirmedTotp
      ? await this.verifyTotp(confirmedTotp, code)
      : null;
    const passed =
      timeStep !== null
        ? await RecordTotpTimeStepCommand(this.prisma, userId, timeStep)
        : (await this.oneTimeCodeService.verifyCode(
            userId,
            'STEP_UP',
            code,
          )) !== null;
    if (!passed) throw new UnauthorizedException('Invalid verification code');

    await ResetAuthAttemptsCommand(this.prisma, userId, 'SECOND_FACTOR');
  }

  private async deleteIfOtherRemains(
    userId: string,
    kind: 'TOTP' | 'EMAIL',
  ): Promise<void> {
    if (
      !(await DeleteTwoFactorMethodIfOtherRemainsCommand(
        this.prisma,
        userId,
        kind,
      ))
    ) {
      throw new BadRequestException(
        'Cannot disable the only active 2FA method.',
      );
    }
  }

  private reserveSecondFactor(userId: string): Promise<boolean> {
    return ReserveAuthAttemptCommand(this.prisma, userId, 'SECOND_FACTOR');
  }
}
