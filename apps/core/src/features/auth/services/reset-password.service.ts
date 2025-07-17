import { Injectable, BadRequestException } from '@nestjs/common';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@weaver2/prisma';
import { FindAuthByPasswordResetTokenQuery } from '../repositories/find-auth-by-password-reset-token.query';
import { UpdateAuthPasswordCommand } from '../repositories/update-auth-password.command';

@Injectable()
export class ResetPasswordService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: ResetPasswordDto): Promise<void> {
    const { token, password } = dto;

    const auth = await FindAuthByPasswordResetTokenQuery(this.prisma, token);

    if (!auth) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await UpdateAuthPasswordCommand(this.prisma, auth.id, hashedPassword);
  }
}
