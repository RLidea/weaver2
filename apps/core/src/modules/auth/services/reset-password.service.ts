import { Injectable, BadRequestException } from '@nestjs/common';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class ResetPasswordService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: ResetPasswordDto): Promise<void> {
    const { token, password } = dto;

    const auth = await this.prisma.auth.findFirst({
      where: {
        passwordResetToken: token,
        resetTokenExpiry: {
          gte: new Date(), // expiry date must be greater than or equal to now
        },
      },
    });

    if (!auth) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.auth.update({
      where: { id: auth.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        resetTokenExpiry: null,
      },
    });
  }
}
