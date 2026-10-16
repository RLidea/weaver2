import { Injectable } from '@nestjs/common';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@weaver2/prisma';
import { generateTokenUtil } from '@weaver2/common/utility/generate-token.util';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { UpdateLocalCredentialResetTokenCommand } from '../repositories/update-local-credential-reset-token.command';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1시간
/**
 * 막 보낸 재설정 링크를 새 요청이 덮어쓰지 못하게 하는 시간.
 * 토큰은 계정마다 하나라 새로 발급하면 앞의 링크가 죽는다 — 남이 같은 이메일로 요청을
 * 거듭 보내 주인의 복구 링크를 계속 죽이지 못하게 한다(미인증 선점 가입을 당한 주인은
 * 재설정이 유일한 복구 길이다). 주인은 받은 메일의 링크를 그대로 쓰면 된다.
 */
const RESET_TOKEN_REISSUE_COOLDOWN_MS = 10 * 60 * 1000; // 10분

@Injectable()
export class RequestPasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailBusinessService: EmailBusinessService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: RequestPasswordResetDto): Promise<void> {
    const { email } = dto;

    const user = await FindUserByEmailQuery(this.prisma, email);
    if (!user || !user.localCredential) {
      // To prevent user enumeration attacks, we don't reveal that the user does not exist.
      // We just return successfully, as if an email was sent.
      return;
    }

    const { resetTokenExpiry } = user.localCredential;
    if (resetTokenExpiry) {
      const issuedAt = resetTokenExpiry.getTime() - RESET_TOKEN_TTL_MS;
      if (Date.now() - issuedAt < RESET_TOKEN_REISSUE_COOLDOWN_MS) {
        // 응답은 같게 둔다(열거 방지) — 앞서 보낸 링크가 아직 살아 있다
        return;
      }
    }

    const token = generateTokenUtil();
    const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await UpdateLocalCredentialResetTokenCommand(
      this.prisma,
      user.id,
      token,
      expiry,
    );

    const resetLink = `${this.configService.get(
      'CLIENT_URL',
    )}/reset-password?token=${token}`;

    await this.emailBusinessService.sendPasswordResetEmail(
      user.email,
      resetLink,
      user.id,
    );
  }
}
