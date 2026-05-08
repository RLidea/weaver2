import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
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
import { randomInt } from 'crypto';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { FindLocalCredentialByUserIdQuery } from '../repositories/find-local-credential-by-user-id.query';
import { FindTwoFactorChallengeQuery } from '../repositories/find-two-factor-challenge.query';
import { CreateTwoFactorChallengeCommand } from '../repositories/create-two-factor-challenge.command';
import { DeleteTwoFactorChallengesCommand } from '../repositories/delete-two-factor-challenges.command';
import { UpdateTotpSettingsCommand } from '../repositories/update-totp-settings.command';
import { UpdateEmailOtpSettingsCommand } from '../repositories/update-email-otp-settings.command';

const TWO_FACTOR_CHALLENGE_METHOD_EMAIL = 'email';
const TWO_FACTOR_CHALLENGE_METHOD_EMAIL_SETUP = 'email-setup';
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10분
const APP_NAME = 'Weaver2';

interface PreAuthPayload {
  sub: string;
  type: 'pre-auth';
  rememberMe: boolean;
}

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailBusinessService: EmailBusinessService,
  ) {}

  // ─────────────────────────────────────────
  // Pre-auth Token
  // ─────────────────────────────────────────

  createPreAuthToken(userId: string, rememberMe = false): string {
    const payload: PreAuthPayload = {
      sub: userId,
      type: 'pre-auth',
      rememberMe,
    };
    return this.jwtService.sign(payload, { expiresIn: '5m' });
  }

  verifyPreAuthToken(token: string): { userId: string; rememberMe: boolean } {
    try {
      const payload = this.jwtService.verify<PreAuthPayload>(token);
      if (payload.type !== 'pre-auth') {
        throw new UnauthorizedException('Invalid pre-auth token');
      }
      return { userId: payload.sub, rememberMe: payload.rememberMe ?? false };
    } catch {
      throw new UnauthorizedException('Invalid or expired pre-auth token');
    }
  }

  // ─────────────────────────────────────────
  // TOTP Setup
  // ─────────────────────────────────────────

  async generateTotpSetup(userId: string) {
    const credential = await FindLocalCredentialByUserIdQuery(
      this.prisma,
      userId,
    );
    if (!credential)
      throw new BadRequestException('Local credential not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const secret = otpGenerateSecret();
    const otpAuthUrl = otpGenerateURI({
      label: user.email,
      issuer: APP_NAME,
      secret,
    });
    const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

    await UpdateTotpSettingsCommand(this.prisma, userId, {
      totpEnabled: false,
      totpSecret: secret,
    });

    return { secret, qrCodeUrl: qrCodeDataUrl, otpAuthUrl };
  }

  async confirmTotpSetup(userId: string, code: string): Promise<void> {
    const credential = await FindLocalCredentialByUserIdQuery(
      this.prisma,
      userId,
    );
    if (!credential?.totpSecret) {
      throw new BadRequestException('TOTP setup not initiated');
    }

    const result = await otpVerify({
      token: code,
      secret: credential.totpSecret,
    });
    if (!result.valid) throw new BadRequestException('Invalid TOTP code');

    await UpdateTotpSettingsCommand(this.prisma, userId, { totpEnabled: true });
    this.logger.log(`TOTP enabled for userId=${userId}`);
  }

  // ─────────────────────────────────────────
  // Email OTP Setup
  // ─────────────────────────────────────────

  async initiateEmailOtpSetup(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const code = this.generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await CreateTwoFactorChallengeCommand(
      this.prisma,
      userId,
      codeHash,
      TWO_FACTOR_CHALLENGE_METHOD_EMAIL_SETUP,
      expiresAt,
    );

    await this.emailBusinessService.sendTwoFactorCodeEmail(
      user.email,
      code,
      userId,
    );
    this.logger.log(`Email OTP setup code sent to userId=${userId}`);
  }

  async confirmEmailOtpSetup(userId: string, code: string): Promise<void> {
    const challenge = await FindTwoFactorChallengeQuery(
      this.prisma,
      userId,
      TWO_FACTOR_CHALLENGE_METHOD_EMAIL_SETUP,
    );
    if (!challenge)
      throw new BadRequestException(
        'No valid Email OTP setup found. Please request a new code.',
      );

    const isValid = await bcrypt.compare(code, challenge.codeHash);
    if (!isValid) throw new BadRequestException('Invalid Email OTP code');

    await UpdateEmailOtpSettingsCommand(this.prisma, userId, true);
    await DeleteTwoFactorChallengesCommand(
      this.prisma,
      userId,
      TWO_FACTOR_CHALLENGE_METHOD_EMAIL_SETUP,
    );
    this.logger.log(`Email OTP enabled for userId=${userId}`);
  }

  // ─────────────────────────────────────────
  // Login 2FA
  // ─────────────────────────────────────────

  async sendEmailOtp(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const credential = await FindLocalCredentialByUserIdQuery(
      this.prisma,
      userId,
    );
    if (!credential?.emailOtpEnabled) {
      throw new BadRequestException(
        'Email OTP is not enabled for this account',
      );
    }

    const code = this.generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await CreateTwoFactorChallengeCommand(
      this.prisma,
      userId,
      codeHash,
      TWO_FACTOR_CHALLENGE_METHOD_EMAIL,
      expiresAt,
    );

    await this.emailBusinessService.sendTwoFactorCodeEmail(
      user.email,
      code,
      userId,
    );
    this.logger.log(`Email OTP login code sent to userId=${userId}`);
  }

  async authenticate(
    preAuthToken: string,
    method: 'totp' | 'email',
    code: string,
  ): Promise<{ userId: string; rememberMe: boolean }> {
    const { userId, rememberMe } = this.verifyPreAuthToken(preAuthToken);

    const credential = await FindLocalCredentialByUserIdQuery(
      this.prisma,
      userId,
    );
    if (!credential) throw new UnauthorizedException('Account not found');

    if (method === 'totp') {
      if (!credential.totpEnabled || !credential.totpSecret) {
        throw new BadRequestException('TOTP is not enabled for this account');
      }
      const result = await otpVerify({
        token: code,
        secret: credential.totpSecret,
      });
      if (!result.valid) throw new UnauthorizedException('Invalid TOTP code');
    } else {
      if (!credential.emailOtpEnabled) {
        throw new BadRequestException(
          'Email OTP is not enabled for this account',
        );
      }
      const challenge = await FindTwoFactorChallengeQuery(
        this.prisma,
        userId,
        TWO_FACTOR_CHALLENGE_METHOD_EMAIL,
      );
      if (!challenge)
        throw new UnauthorizedException(
          'No valid Email OTP found. Please request a new code.',
        );

      const isValid = await bcrypt.compare(code, challenge.codeHash);
      if (!isValid) throw new UnauthorizedException('Invalid Email OTP code');

      await DeleteTwoFactorChallengesCommand(
        this.prisma,
        userId,
        TWO_FACTOR_CHALLENGE_METHOD_EMAIL,
      );
    }

    this.logger.log(`2FA authenticated via ${method} for userId=${userId}`);
    return { userId, rememberMe };
  }

  // ─────────────────────────────────────────
  // Disable 2FA
  // ─────────────────────────────────────────

  async disableTotp(userId: string, code: string): Promise<void> {
    const credential = await FindLocalCredentialByUserIdQuery(
      this.prisma,
      userId,
    );
    if (!credential?.totpEnabled)
      throw new BadRequestException('TOTP is not enabled');

    if (!credential.emailOtpEnabled) {
      throw new BadRequestException(
        'Cannot disable TOTP: it is the only active 2FA method. Enable Email OTP first.',
      );
    }

    await this.verifyAnyMethodCode(userId, code, credential);
    await UpdateTotpSettingsCommand(this.prisma, userId, {
      totpEnabled: false,
      totpSecret: null,
    });
    this.logger.log(`TOTP disabled for userId=${userId}`);
  }

  async disableEmailOtp(userId: string, code: string): Promise<void> {
    const credential = await FindLocalCredentialByUserIdQuery(
      this.prisma,
      userId,
    );
    if (!credential?.emailOtpEnabled)
      throw new BadRequestException('Email OTP is not enabled');

    if (!credential.totpEnabled) {
      throw new BadRequestException(
        'Cannot disable Email OTP: it is the only active 2FA method. Enable TOTP first.',
      );
    }

    await this.verifyAnyMethodCode(userId, code, credential);
    await UpdateEmailOtpSettingsCommand(this.prisma, userId, false);
    await DeleteTwoFactorChallengesCommand(this.prisma, userId);
    this.logger.log(`Email OTP disabled for userId=${userId}`);
  }

  // ─────────────────────────────────────────
  // Status
  // ─────────────────────────────────────────

  async getStatus(userId: string) {
    const credential = await FindLocalCredentialByUserIdQuery(
      this.prisma,
      userId,
    );
    return {
      totpEnabled: credential?.totpEnabled ?? false,
      emailOtpEnabled: credential?.emailOtpEnabled ?? false,
    };
  }

  // ─────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────

  private generateOtpCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private async verifyAnyMethodCode(
    userId: string,
    code: string,
    credential: {
      totpEnabled: boolean;
      totpSecret: string | null;
      emailOtpEnabled: boolean;
    },
  ): Promise<void> {
    if (credential.totpEnabled && credential.totpSecret) {
      const result = await otpVerify({
        token: code,
        secret: credential.totpSecret,
      });
      if (result.valid) return;
    }

    if (credential.emailOtpEnabled) {
      const challenge = await FindTwoFactorChallengeQuery(
        this.prisma,
        userId,
        TWO_FACTOR_CHALLENGE_METHOD_EMAIL,
      );
      if (challenge) {
        const isValid = await bcrypt.compare(code, challenge.codeHash);
        if (isValid) return;
      }
    }

    throw new UnauthorizedException('Invalid verification code');
  }
}
