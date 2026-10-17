import { Injectable, BadRequestException } from '@nestjs/common';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@weaver2/prisma';
import { UpdateLocalCredentialPasswordCommand } from '../repositories/update-local-credential-password.command';
import { DeleteRefreshTokensByUserIdCommand } from '../repositories/delete-refresh-tokens-by-user-id.command';
import { OneTimeCodeService } from '../one-time-code/one-time-code.service';
import { ResetAuthAttemptsCommand } from '../repositories/reset-auth-attempts.command';

const INVALID_TOKEN = 'Invalid or expired password reset token.';

@Injectable()
export class ResetPasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oneTimeCodeService: OneTimeCodeService,
  ) {}

  async execute(dto: ResetPasswordDto): Promise<void> {
    const { token, password } = dto;
    const hashedPassword = await bcrypt.hash(password, 10);

    // 링크 소비부터 세션 무효화까지 한 트랜잭션 — 중간에 실패하면 링크도 되살아난다.
    // 같은 링크로 동시에 두 번 와도 소비는 하나만 성공한다.
    await this.prisma.$transaction(async (tx) => {
      const userId = await this.oneTimeCodeService.consumeLink(
        token,
        'PASSWORD_RESET',
        tx,
      );
      if (!userId) throw new BadRequestException(INVALID_TOKEN);

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { deletedAt: true, emailVerifiedAt: true },
      });
      if (!user || user.deletedAt) throw new BadRequestException(INVALID_TOKEN);

      await UpdateLocalCredentialPasswordCommand(tx, userId, hashedPassword);
      // 비밀번호 잠금만 푼다 — 남이 비밀번호를 틀려 잠근 계정을 주인이 되찾는 길이다.
      // SECOND_FACTOR 까지 비우면 메일함을 가진 공격자가 「TOTP 5번 → 재설정 → 5번 더」를
      // 되풀이할 수 있다.
      await ResetAuthAttemptsCommand(tx, userId, 'PASSWORD');

      // 재설정 링크를 받았다는 것은 메일함을 가졌다는 증명이다 — 인증도 함께 끝낸다.
      // 미인증 선점 가입을 당한 주인은 이 길로 계정을 되찾는다. 그 경우 가입은 다른
      // 사람이 했을 수 있으니, 주인이 준 적 없는 마케팅 수신 동의를 되돌리고 남아 있던
      // 인증 링크도 버린다.
      if (!user.emailVerifiedAt) {
        await tx.user.update({
          where: { id: userId },
          data: { emailVerifiedAt: new Date() },
        });
        await tx.userSetting.updateMany({
          where: { userId },
          data: { isMarketingConsentGiven: false },
        });
        await tx.oneTimeCode.deleteMany({
          where: { userId, purpose: 'EMAIL_VERIFICATION' },
        });
        // 검증되지 않은 이메일로 붙은 소셜 연동도 끊는다 — 선점한 사람이 공급자 로그인으로
        // 되찾은 계정에 다시 들어오지 못하게. 주인은 로그인한 뒤 설정에서 다시 연동한다.
        await tx.oAuthAccount.deleteMany({ where: { userId } });
      }

      // 비밀번호가 바뀌면 기존 세션을 전부 무효화한다(변경 경로와 동일 정책).
      // 계정이 이미 탈취된 상태에서 재설정으로 복구할 때 공격자 세션이 살아남지 않게 함.
      await DeleteRefreshTokensByUserIdCommand(tx, userId);
    });
  }
}
