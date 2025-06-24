import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { EmailSignUpDto } from './dto/email-sign-up.dto';
import { UserService } from '../user/user.service';
import { SignUpCommand } from './repositories/sign-up.command';
import { UpdateValidationTokenCommand } from './repositories/update-validation-token.command';
import { FindAuthByTokenQuery } from './repositories/find-auth-by-token.query';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async validateUserByEmail(email: string, password: string) {
    const auth = await this.prisma.auth.findUnique({
      where: { email },
      include: { user: true },
    });

    if (!auth || !auth.password)
      throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, auth.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    console.log('# ', auth.user);
    return auth.user;
  }

  async validateUserById(userId: string, authId: string) {
    const auth = await this.prisma.auth.findUnique({
      where: { userId, id: authId },
      include: { user: true },
    });
    if (!auth) throw new UnauthorizedException('Invalid credentials');
    return auth.user;
  }

  async login(user: any, provider: string) {
    console.log(user);
    let auth;
    if (provider === 'email') {
      auth = await this.prisma.auth.findFirst({
        where: {
          userId: user.id,
          password: { not: null },
        },
      });
    }
    const payload = { sub: user.id, authId: auth.id };
    const generatedRefreshToken = await this.generateRefreshToken(auth.id);
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: generatedRefreshToken,
    };
  }

  async generateRefreshToken(authId: string) {
    const token = randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7일

    await this.prisma.refreshToken.create({
      data: { token, authId, expires },
    });

    return token;
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { auth: true },
    });

    if (!stored || stored.expires < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.auth.userId },
    });

    return {
      accessToken: this.jwtService.sign({
        sub: user?.id,
        authId: stored.auth.id,
      }),
    };
  }

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
      await UpdateValidationTokenCommand(this.prisma, {
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
    // TODO: send email
    return;
  }
}
