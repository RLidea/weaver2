import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@weaver2/prisma';
import { EmailSignUpDto } from '../dto/email-sign-up.dto';
import * as bcrypt from 'bcrypt';
import { SignUpCommand } from '../repositories/sign-up.command';
import { CreateValidationTokenCommand } from '../repositories/create-validation-token.command';
import { FindAuthByTokenQuery } from '../repositories/find-auth-by-token.query';

@Injectable()
export class SignUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
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
    await FindAuthByTokenQuery(this.prisma, {
      verificationToken: token,
    });
    // TODO: remove token and update isValidate
    // TODO: send email
    return;
  }
}
