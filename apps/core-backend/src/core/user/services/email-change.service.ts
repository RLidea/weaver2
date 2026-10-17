import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { FindLocalCredentialByUserIdQuery } from '../../auth/repositories/find-local-credential-by-user-id.query';
import { UpdateUserEmailCommand } from '../repositories/update-user-email.command';
import { normalizeEmail } from '../../auth/utils/email.util';
import { OneTimeCodeService } from '../../auth/one-time-code/one-time-code.service';
import {
  ACCOUNT_LOCKED_MESSAGE,
  ReserveAuthAttemptCommand,
} from '../../auth/repositories/reserve-auth-attempt.command';
import { ResetAuthAttemptsCommand } from '../../auth/repositories/reset-auth-attempts.command';

@Injectable()
export class EmailChangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailBusinessService: EmailBusinessService,
    private readonly oneTimeCodeService: OneTimeCodeService,
  ) {}

  async requestEmailChange(
    userId: string,
    currentPassword: string,
    newEmail: string,
  ): Promise<void> {
    const credential = await FindLocalCredentialByUserIdQuery(
      this.prisma,
      userId,
    );

    if (!credential?.passwordHash) {
      throw new UnauthorizedException('Password not set for this account.');
    }

    // 세션을 가진 사람(탈취된 세션 포함)의 현재 비밀번호 대입도 PASSWORD 잠금에 센다
    if (!(await ReserveAuthAttemptCommand(this.prisma, userId, 'PASSWORD'))) {
      throw new UnauthorizedException(ACCOUNT_LOCKED_MESSAGE);
    }
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      credential.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password.');
    }
    await ResetAuthAttemptsCommand(this.prisma, userId, 'PASSWORD');

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(newEmail) },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException('Email is already in use.');
    }

    // 새 주소는 코드와 함께 저장한다 — 확인 때 입력이 아니라 이 값으로 바꾼다
    const normalized = normalizeEmail(newEmail);
    const code = await this.oneTimeCodeService.issueCode(
      userId,
      'EMAIL_CHANGE',
      { newEmail: normalized },
    );
    if (!code) {
      throw new HttpException(
        'A code was sent recently. Use it or try again in a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.oneTimeCodeService.deliverOrRevoke(userId, 'EMAIL_CHANGE', () =>
      this.emailBusinessService.sendEmailChangeVerificationEmail(
        normalized,
        code,
        userId,
      ),
    );
  }

  async confirmEmailChange(userId: string, code: string): Promise<void> {
    // 틀림·만료·없음·시도 소진을 가르지 않는다 — 어느 쪽이든 다시 요청하면 된다
    const verified = await this.oneTimeCodeService.verifyCode(
      userId,
      'EMAIL_CHANGE',
      code,
    );
    if (!verified?.newEmail) {
      throw new BadRequestException(
        'Invalid or expired verification code. Please request a new code.',
      );
    }

    // 요청 뒤 그 주소로 다른 계정이 생겼으면 unique 충돌이다 — 500 이 아니라 409 로
    try {
      await UpdateUserEmailCommand(this.prisma, userId, verified.newEmail);
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'P2002') {
        throw new ConflictException('Email is already in use.');
      }
      throw e;
    }
  }
}
