import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@weaver2/prisma';
import { EmailSignUpDto } from '../dto/email-sign-up.dto';
import * as bcrypt from 'bcrypt';
import { SignUpCommand } from '../repositories/sign-up.command';
import { CreateValidationTokenCommand } from '../repositories/create-validation-token.command';
import { FindAuthByTokenQuery } from '../repositories/find-auth-by-token.query';
import { EmailService } from '../../email/email.service';
import { welcomeEmailTemplate } from '../../email/templates/welcome.template';
import { verifyEmailTemplate } from '../../email/templates/verify-email.template';

@Injectable()
export class SignUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
  ) {}

  async emailSignUp(dto: EmailSignUpDto) {
    const { username, displayName, email, password } = dto;

    await this.userService.checkExistingUser({
      username,
      displayName,
      email,
    });
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // create user
      const createdUser = await SignUpCommand(this.prisma, {
        username,
        displayName,
        role: 'USER',
        email,
        hashedPassword,
      });
      // create validation token
      await CreateValidationTokenCommand(this.prisma, {
        userId: createdUser.id,
        email,
      });

      // send email
      await this.emailService.sendMail({
        to: email,
        subject: verifyEmailTemplate().subject,
        html: verifyEmailTemplate().html,
      });

      return {
        message: 'Sign-up completed successfully.',
        user: {
          id: createdUser.id,
          username: createdUser.username,
          displayName: createdUser.displayName,
        },
      };
    } catch (err) {
      throw new InternalServerErrorException(
        err,
        'Failed to complete sign-up process.',
      );
    }
  }

  async verifyEmail(token: string) {
    const auth = await FindAuthByTokenQuery(this.prisma, {
      verificationToken: token,
    });
    // check valid token
    if (!auth) {
      throw new BadRequestException('Invalid verification token.');
    }
    // check token expiry
    if (
      !auth?.verificationTokenExpiry ||
      auth?.verificationTokenExpiry < new Date()
    ) {
      throw new BadRequestException('Verification token has expired.');
    }
    // remove token and update isValidate
    await this.prisma.auth.update({
      where: { id: auth.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });
    // send email
    await this.emailService.sendMail({
      to: auth.email,
      subject: welcomeEmailTemplate().subject,
      html: welcomeEmailTemplate().html,
    });
    return {
      message: 'Email successfully verified.',
    };
  }
}
