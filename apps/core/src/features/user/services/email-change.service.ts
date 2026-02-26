import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { FindLocalCredentialByUserIdQuery } from '../../auth/repositories/find-local-credential-by-user-id.query';
import { CreateEmailChangeRequestCommand } from '../repositories/create-email-change-request.command';
import { FindEmailChangeRequestQuery } from '../repositories/find-email-change-request.query';
import { DeleteEmailChangeRequestsCommand } from '../repositories/delete-email-change-requests.command';
import { UpdateUserEmailCommand } from '../repositories/update-user-email.command';

const EMAIL_CHANGE_CODE_EXPIRY_MS = 10 * 60 * 1000; // 10분

@Injectable()
export class EmailChangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailBusinessService: EmailBusinessService,
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

    if (!credential?.password) {
      throw new UnauthorizedException('Password not set for this account.');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      credential.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException('Email is already in use.');
    }

    const code = randomInt(100000, 999999).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_CODE_EXPIRY_MS);

    await CreateEmailChangeRequestCommand(
      this.prisma,
      userId,
      newEmail,
      codeHash,
      expiresAt,
    );

    await this.emailBusinessService.sendEmailChangeVerificationEmail(
      newEmail,
      code,
      userId,
    );
  }

  async confirmEmailChange(userId: string, code: string): Promise<void> {
    const request = await FindEmailChangeRequestQuery(this.prisma, userId);

    if (!request) {
      throw new BadRequestException(
        'No pending email change request found or request has expired.',
      );
    }

    const isCodeValid = await bcrypt.compare(code, request.codeHash);
    if (!isCodeValid) {
      throw new BadRequestException('Invalid verification code.');
    }

    await UpdateUserEmailCommand(this.prisma, userId, request.newEmail);
    await DeleteEmailChangeRequestsCommand(this.prisma, userId);
  }
}
