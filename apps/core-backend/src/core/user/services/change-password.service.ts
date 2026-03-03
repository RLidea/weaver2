import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { FindLocalCredentialByUserIdQuery } from '../../auth/repositories/find-local-credential-by-user-id.query';
import { UpdateLocalCredentialPasswordCommand } from '../../auth/repositories/update-local-credential-password.command';
import { DeleteRefreshTokensByUserIdCommand } from '../../auth/repositories/delete-refresh-tokens-by-user-id.command';

@Injectable()
export class ChangePasswordService {
  constructor(private readonly prisma: PrismaService) {}

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const credential = await FindLocalCredentialByUserIdQuery(
      this.prisma,
      userId,
    );

    if (!credential || !credential.password) {
      throw new UnauthorizedException(
        'Authentication record not found or password not set.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      credential.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password.');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await UpdateLocalCredentialPasswordCommand(
      this.prisma,
      userId,
      hashedNewPassword,
    );

    await DeleteRefreshTokensByUserIdCommand(this.prisma, userId);
  }
}
