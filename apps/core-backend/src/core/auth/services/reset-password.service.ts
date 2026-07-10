import { Injectable, BadRequestException } from '@nestjs/common';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@weaver2/prisma';
import { FindLocalCredentialByResetTokenQuery } from '../repositories/find-local-credential-by-reset-token.query';
import { UpdateLocalCredentialPasswordCommand } from '../repositories/update-local-credential-password.command';
import { DeleteRefreshTokensByUserIdCommand } from '../repositories/delete-refresh-tokens-by-user-id.command';

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

    // 비밀번호가 바뀌면 기존 세션을 전부 무효화한다(변경 경로와 동일 정책).
    // 계정이 이미 탈취된 상태에서 재설정으로 복구할 때 공격자 세션이 살아남지 않게 함.
    await DeleteRefreshTokensByUserIdCommand(this.prisma, credential.userId);
  }
}
