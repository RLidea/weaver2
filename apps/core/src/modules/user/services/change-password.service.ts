import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Injectable()
export class ChangePasswordService {
  constructor(private readonly prisma: PrismaService) {}

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const auth = await this.prisma.auth.findUnique({
      where: { userId },
    });

    if (!auth || !auth.password) {
      throw new UnauthorizedException(
        'Authentication record not found or password not set.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      auth.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password.');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.auth.update({
      where: { userId },
      data: { password: hashedNewPassword },
    });
  }
}
