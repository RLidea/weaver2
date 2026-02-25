import { Injectable, BadRequestException } from '@nestjs/common';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@weaver2/prisma';
import { FindLocalCredentialByResetTokenQuery } from '../repositories/find-local-credential-by-reset-token.query';
import { UpdateLocalCredentialPasswordCommand } from '../repositories/update-local-credential-password.command';

@Injectable()
export class ResetPasswordService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: ResetPasswordDto): Promise<void> {
    const { token, password } = dto;

    const credential = await FindLocalCredentialByResetTokenQuery(
      this.prisma,
      token,
    );

    if (!credential) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await UpdateLocalCredentialPasswordCommand(
      this.prisma,
      credential.userId,
      hashedPassword,
    );
  }
}
