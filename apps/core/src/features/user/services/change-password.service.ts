import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { FindAuthByUserIdQuery } from '../../auth/repositories/find-auth-by-user-id.query';
import { UpdateAuthPasswordByUserIdCommand } from '../../auth/repositories/update-auth-password-by-user-id.command';

@Injectable()
export class ChangePasswordService {
  constructor(private readonly prisma: PrismaService) {}

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const auth = await FindAuthByUserIdQuery(this.prisma, userId);

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

    await UpdateAuthPasswordByUserIdCommand(
      this.prisma,
      userId,
      hashedNewPassword,
    );
  }
}
