import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { FindLocalCredentialByUserIdQuery } from '../../auth/repositories/find-local-credential-by-user-id.query';
import { UpdateLocalCredentialPasswordCommand } from '../../auth/repositories/update-local-credential-password.command';
import { DeleteRefreshTokensByUserIdCommand } from '../../auth/repositories/delete-refresh-tokens-by-user-id.command';
import { LockUsersCommand } from '../../auth/repositories/lock-users.command';
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

    // 바꾸기와 세션 지우기를 사용자 행 잠금 아래 한 트랜잭션에서 — 재설정과 같은 모양이다.
    // 로그인도 이 행을 잠그고 passwordChangedAt 을 견주므로, 옛 비밀번호로 맞춰 본 로그인이
    // 지우기 뒤에 새 refresh 행을 남기지 못한다 (SignInService.login)
    await this.prisma.$transaction(async (tx) => {
      await LockUsersCommand(tx, [userId]);
      await UpdateLocalCredentialPasswordCommand(tx, userId, hashedNewPassword);
      await DeleteRefreshTokensByUserIdCommand(tx, userId);
    });
  }
}
