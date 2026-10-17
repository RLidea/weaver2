import { Injectable } from '@nestjs/common';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@weaver2/prisma';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { OneTimeCodeService } from '../one-time-code/one-time-code.service';

@Injectable()
export class RequestPasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailBusinessService: EmailBusinessService,
    private readonly configService: ConfigService,
    private readonly oneTimeCodeService: OneTimeCodeService,
  ) {}

  async execute(dto: RequestPasswordResetDto): Promise<void> {
    const { email } = dto;

    // 탈퇴한 계정은 찾지 않는다(FindUserByEmailQuery)
    const user = await FindUserByEmailQuery(this.prisma, email);
    if (!user || !user.localCredential) {
      // To prevent user enumeration attacks, we don't reveal that the user does not exist.
      // We just return successfully, as if an email was sent.
      return;
    }

    // 막 보낸 링크는 재발급 유예(10분) 동안 덮어쓰지 못한다. 링크는 계정마다 하나라
    // 새로 발급하면 앞의 것이 죽는다 — 남이 같은 이메일로 요청을 거듭 보내 주인의 복구
    // 링크를 계속 죽이지 못하게 한다(미인증 선점 가입을 당한 주인은 재설정이 유일한
    // 복구 길이다). 응답은 같게 둔다(열거 방지) — 앞서 보낸 링크가 아직 살아 있다.
    const token = await this.oneTimeCodeService.issueLink(
      user.id,
      'PASSWORD_RESET',
    );
    if (!token) return;

    const resetLink = `${this.configService.get(
      'CLIENT_URL',
    )}/reset-password?token=${token}`;

    await this.oneTimeCodeService.deliverOrRevoke(
      user.id,
      'PASSWORD_RESET',
      () =>
        this.emailBusinessService.sendPasswordResetEmail(
          user.email,
          resetLink,
          user.id,
        ),
    );
  }
}
