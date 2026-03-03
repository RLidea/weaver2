import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@weaver2/prisma';
import { EmailSignUpDto } from '../dto/email-sign-up.dto';
import * as bcrypt from 'bcrypt';
import { SignUpCommand } from '../repositories/sign-up.command';
import { CreateValidationTokenCommand } from '../repositories/create-validation-token.command';
import { FindLocalCredentialByTokenQuery } from '../repositories/find-local-credential-by-token.query';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { FindUserService } from '../../user/services/find-user.service';
import { CreateUserSettingCommand } from '../../user/repositories/create-user-setting.command';
import { CreateUserTermsAgreementCommand } from '../../user/repositories/create-user-terms-agreement.command';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { TermsService } from '../../terms/services/terms.service';

@Injectable()
export class SignUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly findUserService: FindUserService,
    private readonly emailBusinessService: EmailBusinessService,
    private readonly termsService: TermsService,
  ) {}

  async emailSignUp(dto: EmailSignUpDto) {
    const { username, displayName, email, password, agreedTermsIds } = dto;

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

      // create validation token
      const token = await CreateValidationTokenCommand(this.prisma, {
        userId: createdUser.id,
      });

      // send verification email using template
      await this.emailBusinessService.sendVerificationEmail(
        email,
        `${this.configService.get('CLIENT_URL')}/auth/verify?token=${token.verificationToken}`,
        createdUser.id,
      );

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

    // 계정 존재 여부를 노출하지 않기 위해 동일한 응답 반환
    if (!user || !user.localCredential || user.localCredential.isVerified) {
      return {
        message:
          'If the email address exists and is unverified, a new verification email has been sent.',
      };
    }

    const token = await CreateValidationTokenCommand(this.prisma, {
      userId: user.id,
    });

    await this.emailBusinessService.sendVerificationEmail(
      email,
      `${this.configService.get('CLIENT_URL')}/auth/verify?token=${token.verificationToken}`,
      user.id,
    );

    return {
      message:
        'If the email address exists and is unverified, a new verification email has been sent.',
    };
  }

  async verifyEmail(token: string) {
    const credential = await FindLocalCredentialByTokenQuery(this.prisma, {
      verificationToken: token,
    });
    // check valid token
    if (!credential) {
      throw new BadRequestException('Invalid verification token.');
    }
    // check token expiry
    if (
      !credential?.verificationTokenExpiry ||
      credential?.verificationTokenExpiry < new Date()
    ) {
      throw new BadRequestException('Verification token has expired.');
    }
    // remove token and update isVerified
    await this.prisma.localCredential.update({
      where: { id: credential.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });
    // send welcome email using template
    const user = await this.prisma.user.findUnique({
      where: { id: credential.userId },
    });

    if (user) {
      await this.emailBusinessService.sendWelcomeEmail(
        user.email,
        user.displayName,
        user.id,
      );
    }
    return {
      message: 'Email successfully verified.',
    };
  }
}
