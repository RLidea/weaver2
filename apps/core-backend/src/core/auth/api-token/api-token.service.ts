import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { FindUserByIdQuery } from '../../user/repositories/find-user-by-id.query';
import { generateApiToken, matchesTokenHash } from './api-token.crypto';
import { CreateApiTokenCommand } from './repositories/create-api-token.command';
import { FindApiTokensQuery } from './repositories/find-api-tokens.query';
import { FindApiTokenByIdQuery } from './repositories/find-api-token-by-id.query';
import { FindApiTokenByPrefixQuery } from './repositories/find-api-token-by-prefix.query';
import { RevokeApiTokenCommand } from './repositories/revoke-api-token.command';
import { TouchApiTokenCommand } from './repositories/touch-api-token.command';

/** 인증에 성공한 토큰 — 가드가 `req.apiToken` · `req.user` 를 이것으로 채운다 */
export interface VerifiedApiToken {
  id: string;
  scopes: string[];
  user: { id: string; username: string };
}

/**
 * 범위 토큰의 발급 · 목록 · 끊기 · 확인.
 *
 * 원문은 발급 응답으로 한 번 나가고 어디에도 남지 않는다. 저장소에는 sha256 해시만 간다.
 * 확인은 prefix 로 행을 찾고 해시를 timingSafeEqual 로 대조한다(api-token.crypto.ts).
 */
@Injectable()
export class ApiTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(input: {
    userId: string;
    name: string;
    scopes: string[];
    expiresAt?: Date | null;
  }) {
    const expiresAt = input.expiresAt ?? null;
    if (expiresAt && expiresAt <= new Date()) {
      throw new BadRequestException('만료 시각은 지금보다 뒤여야 합니다.');
    }
    if (!(await FindUserByIdQuery(this.prisma, input.userId))) {
      throw new NotFoundException('토큰의 주인을 찾을 수 없습니다.');
    }

    const { raw, prefix, tokenHash } = generateApiToken();
    const apiToken = await CreateApiTokenCommand(this.prisma, {
      userId: input.userId,
      name: input.name,
      prefix,
      tokenHash,
      scopes: [...new Set(input.scopes)],
      expiresAt,
    });
    return { token: raw, apiToken };
  }

  list(filter: { userId?: string }) {
    return FindApiTokensQuery(this.prisma, filter);
  }

  /** 되살리지 않는다. 이미 끊긴 토큰이면 처음 시각을 그대로 돌려준다 */
  async revoke(id: string) {
    await RevokeApiTokenCommand(this.prisma, id, new Date());
    const apiToken = await FindApiTokenByIdQuery(this.prisma, id);
    if (!apiToken) throw new NotFoundException('토큰을 찾을 수 없습니다.');
    return apiToken;
  }

  /**
   * 원문이 살아 있는 토큰이면 그 토큰을, 아니면 null.
   * null 의 까닭(없음 · 해시 다름 · 끊김 · 만료 · 주인 탈퇴 · 주인 정지)은 밖에 알리지 않는다 — 모두 401 이다.
   * `lastUsedAt` 은 여기서 쓰지 않는다. 범위까지 맞은 뒤 가드가 `markUsed` 를 부른다.
   */
  async verify(presented: {
    raw: string;
    prefix: string;
  }): Promise<VerifiedApiToken | null> {
    const found = await FindApiTokenByPrefixQuery(
      this.prisma,
      presented.prefix,
    );
    if (!found || !matchesTokenHash(presented.raw, found.tokenHash)) {
      return null;
    }
    const now = new Date();
    if (found.revokedAt) return null;
    if (found.expiresAt && found.expiresAt <= now) return null;
    if (found.user.deletedAt) return null;
    if (found.user.suspendedUntil && found.user.suspendedUntil > now) {
      return null;
    }
    return {
      id: found.id,
      scopes: found.scopes,
      user: { id: found.user.id, username: found.user.username },
    };
  }

  markUsed(id: string): Promise<void> {
    return TouchApiTokenCommand(this.prisma, id, new Date());
  }
}
