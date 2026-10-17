import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { FindLocalCredentialByUserIdQuery } from '../../auth/repositories/find-local-credential-by-user-id.query';
import { UpdateLocalCredentialPasswordCommand } from '../../auth/repositories/update-local-credential-password.command';
import { DeleteRefreshTokensByUserIdCommand } from '../../auth/repositories/delete-refresh-tokens-by-user-id.command';
import {
  ACCOUNT_LOCKED_MESSAGE,
  ReserveAuthAttemptCommand,
} from '../../auth/repositories/reserve-auth-attempt.command';
import { ResetAuthAttemptsCommand } from '../../auth/repositories/reset-auth-attempts.command';

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

    if (!credential || !credential.passwordHash) {
      throw new UnauthorizedException(
        'Authentication record not found or password not set.',
      );
    }

    // 세션을 가진 사람(탈취된 세션 포함)의 현재 비밀번호 대입도 PASSWORD 잠금에 센다
    if (!(await ReserveAuthAttemptCommand(this.prisma, userId, 'PASSWORD'))) {
      throw new UnauthorizedException(ACCOUNT_LOCKED_MESSAGE);
    }
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      credential.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password.');
    }
    await ResetAuthAttemptsCommand(this.prisma, userId, 'PASSWORD');

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await UpdateLocalCredentialPasswordCommand(
      this.prisma,
      userId,
      hashedNewPassword,
    );

    await DeleteRefreshTokensByUserIdCommand(this.prisma, userId);
  }
}
