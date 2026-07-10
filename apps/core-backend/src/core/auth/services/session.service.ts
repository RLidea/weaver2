import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { FindRefreshTokensByUserIdQuery } from '../repositories/find-refresh-tokens-by-user-id.query';
import { DeleteRefreshTokenByIdCommand } from '../repositories/delete-refresh-token-by-id.command';
import { DeleteOtherRefreshTokensCommand } from '../repositories/delete-other-refresh-tokens.command';
import { FindRefreshTokenQuery } from '../repositories/find-refresh-token.query';
import { hashToken } from '../utils/auth-crypto.util';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async listSessions(userId: string, currentToken: string | undefined) {
    const sessions = await FindRefreshTokensByUserIdQuery(this.prisma, userId);

    let currentTokenRecord: { id: string } | null = null;
    if (currentToken) {
      currentTokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: hashToken(currentToken) },
        select: { id: true },
      });
    }

    return sessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      isCurrent: currentTokenRecord?.id === session.id,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const result = await DeleteRefreshTokenByIdCommand(
      this.prisma,
      sessionId,
      userId,
    );

    if (result.count === 0) {
      throw new NotFoundException('Session not found');
    }
  }

  async revokeOtherSessions(userId: string, currentToken: string | undefined) {
    if (!currentToken) {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
      return;
    }

    const stored = await FindRefreshTokenQuery(this.prisma, currentToken);
    if (!stored) {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
      return;
    }

    await DeleteOtherRefreshTokensCommand(this.prisma, userId, currentToken);
  }
}
