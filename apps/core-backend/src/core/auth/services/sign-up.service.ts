import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { isReservedUsername, isReservedDisplayName } from '@weaver2/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@weaver2/prisma';
import { EmailSignUpDto } from '../dto/email-sign-up.dto';
import * as bcrypt from 'bcrypt';
import { SignUpCommand } from '../repositories/sign-up.command';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { FindUserService } from '../../user/services/find-user.service';
import { CreateUserSettingCommand } from '../../user/repositories/create-user-setting.command';
import { CreateUserTermsAgreementCommand } from '../../user/repositories/create-user-terms-agreement.command';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { TermsService } from '../../terms/services/terms.service';
import { OneTimeCodeService } from '../one-time-code/one-time-code.service';
import {
  ACCOUNT_LOCKED_MESSAGE,
  ReserveAuthAttemptCommand,
} from '../repositories/reserve-auth-attempt.command';
import { ResetAuthAttemptsCommand } from '../repositories/reset-auth-attempts.command';

@Injectable()
export class SignUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly findUserService: FindUserService,
    private readonly emailBusinessService: EmailBusinessService,
    private readonly termsService: TermsService,
    private readonly oneTimeCodeService: OneTimeCodeService,
  ) {}

  async emailSignUp(dto: EmailSignUpDto) {
    const { username, displayName, email, password, agreedTermsIds } = dto;

    if (isReservedUsername(username)) {
      throw new BadRequestException('사용할 수 없는 사용자 이름입니다.');
    }

    if (isReservedDisplayName(displayName)) {
      throw new BadRequestException('사용할 수 없는 닉네임입니다.');
    }

    await this.findUserService.checkExistingUser({
      username,
      displayName,
      email,
    });
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // Validate terms agreement
      const latestTerms = await this.termsService.getLatestTerms();
      const requiredTermsIds = latestTerms.map((term) => term.id);

      const missingTerms = requiredTermsIds.filter(
        (id) => !agreedTermsIds.includes(id),
      );

      if (missingTerms.length > 0) {
        throw new BadRequestException('Missing agreement for required terms.');
      }

      // create user
      const createdUser = await SignUpCommand(this.prisma, {
        username,
        displayName,
        email,
        hashedPassword,
      });

      // Create UserSetting for the newly created user
      const marketingTerm = latestTerms.find((term) =>
        term.title.includes('마케팅'),
      );
      const isMarketingConsentGiven = agreedTermsIds.includes(
        marketingTerm?.id || '',
      );
      await CreateUserSettingCommand(this.prisma, createdUser.id, {
        isMarketingConsentGiven: isMarketingConsentGiven,
        // Other settings will use their defaults
      });

      // Create UserTermsAgreement records
      const userTermsAgreements = agreedTermsIds.map((termId) => ({
        userId: createdUser.id,
        termsAndConditionsId: termId,
      }));

      await CreateUserTermsAgreementCommand(this.prisma, userTermsAgreements);

      // 막 만든 계정이라 앞선 링크가 없어 유예에 걸리지 않는다
      const token = await this.oneTimeCodeService.issueLink(
        createdUser.id,
        'EMAIL_VERIFICATION',
      );
      if (token) {
        await this.oneTimeCodeService.deliverOrRevoke(
          createdUser.id,
          'EMAIL_VERIFICATION',
          () =>
            this.emailBusinessService.sendVerificationEmail(
              email,
              this.verificationLink(token),
              createdUser.id,
            ),
        );
      }

      return {
        message: 'Sign-up completed successfully.',
        user: {
          id: createdUser.id,
          username: createdUser.username,
          displayName: createdUser.displayName,
        },
      };
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new InternalServerErrorException(
        err,
        'Failed to complete sign-up process.',
      );
    }
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await FindUserByEmailQuery(this.prisma, email);

    // 계정 존재 여부를 노출하지 않기 위해 동일한 응답 반환.
    // 재발급 유예(10분) 중이어도 같다 — 앞서 보낸 링크가 아직 살아 있다.
    const token =
      user && user.localCredential && !user.emailVerifiedAt
        ? await this.oneTimeCodeService.issueLink(user.id, 'EMAIL_VERIFICATION')
        : null;

    if (user && token) {
      // 입력값이 아니라 저장된 주소로 보낸다
      await this.oneTimeCodeService.deliverOrRevoke(
        user.id,
        'EMAIL_VERIFICATION',
        () =>
          this.emailBusinessService.sendVerificationEmail(
            user.email,
            this.verificationLink(token),
            user.id,
          ),
      );
    }

    return {
      message:
        'If the email address exists and is unverified, a new verification email has been sent.',
    };
  }

  /**
   * 인증 링크의 토큰과 가입 때 정한 비밀번호가 둘 다 맞아야 인증한다.
   *
   * 토큰만으로 인증하면 선점 가입으로 계정을 빼앗긴다 — 남의 이메일로 자기 비밀번호를
   * 정해 가입해 두면 인증 메일이 진짜 주인에게 가고, 주인이 링크를 누르는 순간 공격자의
   * 비밀번호가 살아난다. 주인은 그 비밀번호를 모르므로 여기서 막히고, 비밀번호 재설정
   * (메일함 소유 증명 → 인증 완료 · 세션 전부 무효화)으로 계정을 되찾는다.
   */
  async verifyEmail(token: string, password: string) {
    // 만료된 링크도 「없음」과 같게 답한다 — 둘을 가를 정보가 링크에 없다
    const ownerId = await this.oneTimeCodeService.findLinkOwner(
      token,
      'EMAIL_VERIFICATION',
    );
    const owner = ownerId
      ? await this.prisma.user.findUnique({
          where: { id: ownerId },
          include: { localCredential: true },
        })
      : null;
    if (!owner || owner.deletedAt || !owner.localCredential) {
      throw new BadRequestException('Invalid verification token.');
    }
    // 비밀번호가 먼저다. 틀려도 링크는 남긴다 — 오타면 다시 입력하면 되고, 주인이 아니면
    // 재설정으로 간다. 링크를 가진 사람의 비밀번호 대입도 PASSWORD 잠금에 센다.
    if (!(await ReserveAuthAttemptCommand(this.prisma, owner.id, 'PASSWORD'))) {
      throw new BadRequestException(ACCOUNT_LOCKED_MESSAGE);
    }
    const passwordMatches = await bcrypt.compare(
      password,
      owner.localCredential.password,
    );
    if (!passwordMatches) {
      throw new BadRequestException('VERIFY_PASSWORD_MISMATCH');
    }
    // 소비와 인증 표시를 한 트랜잭션으로 — 같은 링크로 동시에 와도 한 번만 인증한다
    const verified = await this.prisma.$transaction(async (tx) => {
      const consumed = await this.oneTimeCodeService.consumeLink(
        token,
        'EMAIL_VERIFICATION',
        tx,
      );
      if (consumed !== owner.id) return false;
      await tx.user.update({
        where: { id: owner.id },
        data: { emailVerifiedAt: new Date() },
      });
      return true;
    });
    if (!verified) {
      throw new BadRequestException('Invalid verification token.');
    }
    await ResetAuthAttemptsCommand(this.prisma, owner.id, 'PASSWORD');

    await this.emailBusinessService.sendWelcomeEmail(
      owner.email,
      owner.displayName,
      owner.id,
    );
    return {
      message: 'Email successfully verified.',
    };
  }

  private verificationLink(token: string): string {
    return `${this.configService.get('CLIENT_URL')}/auth/verify?token=${token}`;
  }
}
