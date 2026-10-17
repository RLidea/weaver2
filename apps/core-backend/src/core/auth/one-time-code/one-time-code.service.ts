import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OneTimeCodePurpose, Prisma, PrismaService } from '@weaver2/prisma';
import { generateTokenUtil } from '@weaver2/common/utility/generate-token.util';
import { hashToken } from '../utils/auth-crypto.util';
import { deriveCodeKey, generateCode, hashCode } from './one-time-code.crypto';
import {
  CODE_COOLDOWN_MS,
  CODE_TTL_MS,
  CodePurpose,
  LINK_COOLDOWN_MS,
  LINK_TTL_MS,
  LinkPurpose,
} from './one-time-code.constants';
import { UpsertOneTimeCodeCommand } from './repositories/upsert-one-time-code.command';
import { FindOneTimeLinkQuery } from './repositories/find-one-time-link.query';
import { ConsumeOneTimeLinkCommand } from './repositories/consume-one-time-link.command';
import { ReserveOneTimeCodeAttemptCommand } from './repositories/reserve-one-time-code-attempt.command';
import { ConsumeOneTimeCodeCommand } from './repositories/consume-one-time-code.command';
import { PurgeExpiredOneTimeCodesCommand } from './repositories/purge-expired-one-time-codes.command';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * 메일로 보내는 일회용 비밀(링크·6자리 코드)의 발급·확인·소비를 한 곳에서 맡는다.
 * 목적마다 살아 있는 것은 하나고(one_time_codes 의 unique), 쓰면 행을 지운다.
 *
 * 발급이 null 이면 재발급 유예 중이다 — 호출자가 그 경로에 맞게 조용히 넘기거나 429 로 답한다.
 */
@Injectable()
export class OneTimeCodeService {
  private readonly codeKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.codeKey = deriveCodeKey(
      configService.getOrThrow<string>('JWT_SECRET'),
    );
  }

  /** 링크 토큰 원문을 돌려준다(메일에만 싣는다). 유예 중이면 null. */
  async issueLink(
    userId: string,
    purpose: LinkPurpose,
    db: Db = this.prisma,
  ): Promise<string | null> {
    const token = generateTokenUtil();
    const now = new Date();
    const written = await UpsertOneTimeCodeCommand(db, {
      userId,
      purpose,
      secretHash: hashToken(token),
      newEmail: null,
      now,
      expiresAt: new Date(now.getTime() + LINK_TTL_MS),
      cooldownMs: LINK_COOLDOWN_MS,
    });
    return written ? token : null;
  }

  /** 링크의 주인을 소비하지 않고 본다 — 다른 확인이 먼저인 경로용. */
  findLinkOwner(token: string, purpose: LinkPurpose): Promise<string | null> {
    return FindOneTimeLinkQuery(
      this.prisma,
      hashToken(token),
      purpose,
      new Date(),
    );
  }

  /** 링크를 확인하고 소비한다. 주인의 userId, 살아 있는 링크가 없으면 null. */
  consumeLink(
    token: string,
    purpose: LinkPurpose,
    db: Db = this.prisma,
  ): Promise<string | null> {
    return ConsumeOneTimeLinkCommand(db, hashToken(token), purpose, new Date());
  }

  /**
   * 6자리 코드 원문을 돌려준다(메일에만 싣는다). 유예 중이거나 시도를 다 쓴 코드가
   * 아직 살아 있으면 null. EMAIL_CHANGE 는 newEmail 이 있어야 한다(DB CHECK 가 지킨다).
   */
  async issueCode(
    userId: string,
    purpose: CodePurpose,
    options: { newEmail?: string } = {},
  ): Promise<string | null> {
    const code = generateCode();
    const now = new Date();
    const written = await UpsertOneTimeCodeCommand(this.prisma, {
      userId,
      purpose,
      secretHash: hashCode(this.codeKey, purpose, userId, code),
      newEmail: options.newEmail ?? null,
      now,
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      cooldownMs: CODE_COOLDOWN_MS,
    });
    return written ? code : null;
  }

  /**
   * 6자리 코드를 확인하고 맞으면 소비한다. 맞으면 { newEmail }, 아니면 null.
   * 확인 전에 시도를 잡으므로, 동시에 몇 번이 와도 한 코드는 5번까지만 확인된다.
   */
  async verifyCode(
    userId: string,
    purpose: CodePurpose,
    code: string,
  ): Promise<{ newEmail: string | null } | null> {
    const id = await ReserveOneTimeCodeAttemptCommand(
      this.prisma,
      userId,
      purpose,
      new Date(),
    );
    if (!id) return null;
    return ConsumeOneTimeCodeCommand(
      this.prisma,
      id,
      hashCode(this.codeKey, purpose, userId, code),
    );
  }

  /**
   * 방금 발급한 것을 메일로 보낸다. 발송이 실패하면 거두고 오류를 그대로 올린다 —
   * 안 거두면 메일도 받지 못한 채 재발급 유예에 걸린다.
   */
  async deliverOrRevoke(
    userId: string,
    purpose: OneTimeCodePurpose,
    send: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await send();
    } catch (err) {
      await this.prisma.oneTimeCode.deleteMany({ where: { userId, purpose } });
      throw err;
    }
  }

  purgeExpired(): Promise<number> {
    return PurgeExpiredOneTimeCodesCommand(this.prisma, new Date());
  }
}
