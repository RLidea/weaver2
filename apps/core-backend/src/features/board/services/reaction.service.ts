import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@weaver2/prisma';
import { PostReactionsResponseDto } from '../dto/post-reactions-response.dto';
import {
  SystemSettingService,
  CONFIG_KEYS,
} from '../../../infrastructure/config/system-setting.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEventDto } from '../../../core/notification/dto/notification-event.dto';

@Injectable()
export class ReactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemSettingService: SystemSettingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getReactions(
    postId: string,
    userId?: string,
    options: { skipPostCheck?: boolean } = {},
  ): Promise<PostReactionsResponseDto> {
    if (!options.skipPostCheck) {
      const post = await this.prisma.post.findUnique({
        where: { id: postId, deletedAt: null },
      });
      if (!post)
        throw new NotFoundException(`Post with ID '${postId}' not found.`);
    }

    // 단일 JOIN+GROUP BY 쿼리로 emoji 정보 + 카운트 + 유저 리액션 여부를 한 번에
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        code: string;
        name: string;
        unicode: string | null;
        imageUrl: string | null;
        isActive: boolean;
        createdAt: Date;
        count: bigint;
        reacted: boolean;
      }>
    >(Prisma.sql`
      SELECT
        e.id, e.code, e.name, e.unicode, e."imageUrl", e."isActive", e."createdAt",
        COUNT(pr.id) AS count,
        ${
          userId
            ? Prisma.sql`COALESCE(BOOL_OR(pr."userId" = ${userId}), false)`
            : Prisma.sql`false`
        } AS reacted
      FROM "post_reactions" pr
      INNER JOIN "emojis" e ON e.id = pr."emojiId"
      WHERE pr."postId" = ${postId}
      GROUP BY e.id, e.code, e.name, e.unicode, e."imageUrl", e."isActive", e."createdAt"
    `);

    const reactions = rows.map((r) => ({
      emoji: {
        id: r.id,
        code: r.code,
        name: r.name,
        unicode: r.unicode,
        imageUrl: r.imageUrl,
        isActive: r.isActive,
        createdAt: r.createdAt,
      },
      count: Number(r.count),
      reacted: r.reacted,
    }));

    const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);
    return { reactions, totalCount };
  }

  async addReaction(
    postId: string,
    userId: string,
    emojiId: string,
  ): Promise<PostReactionsResponseDto> {
    // 게시글 존재 확인
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post)
      throw new NotFoundException(`Post with ID '${postId}' not found.`);

    // 이모지 존재 및 활성화 확인
    const emoji = await this.prisma.emoji.findUnique({
      where: { id: emojiId },
    });
    if (!emoji || !emoji.isActive) {
      throw new NotFoundException(
        `Emoji with ID '${emojiId}' not found or inactive.`,
      );
    }

    // 유저당 최대 리액션 수 확인
    const maxRaw = await this.systemSettingService.getRaw(
      CONFIG_KEYS.REACTION_MAX_PER_USER_PER_POST,
    );
    const max = parseInt(maxRaw ?? '1', 10);

    const currentCount = await this.prisma.postReaction.count({
      where: { postId, userId },
    });
    if (currentCount >= max) {
      throw new BadRequestException(
        `게시글당 최대 ${max}개의 리액션만 남길 수 있습니다.`,
      );
    }

    // 중복 체크는 DB unique constraint가 처리 (Prisma P2002 에러)
    try {
      await this.prisma.postReaction.create({
        data: { postId, userId, emojiId },
      });
    } catch (e: unknown) {
      const prismaError = e as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new BadRequestException('이미 해당 이모지로 리액션했습니다.');
      }
      throw e;
    }

    // 게시글 작성자에게 리액션 알림
    if (post.authorId) {
      const event: NotificationEventDto = {
        recipientId: post.authorId,
        actorId: userId,
        type: 'REACTION',
        title: '게시글에 리액션이 달렸습니다',
        body: `${emoji.name} 리액션`,
        link: `/boards/${post.boardId}/posts/${postId}`,
      };
      this.eventEmitter.emit('notification.created', event);
    }

    return this.getReactions(postId, userId, { skipPostCheck: true });
  }

  async removeReaction(
    postId: string,
    userId: string,
    emojiId: string,
  ): Promise<PostReactionsResponseDto> {
    const reaction = await this.prisma.postReaction.findUnique({
      where: { postId_userId_emojiId: { postId, userId, emojiId } },
    });
    if (!reaction) {
      throw new NotFoundException('해당 리액션을 찾을 수 없습니다.');
    }

    await this.prisma.postReaction.delete({
      where: { postId_userId_emojiId: { postId, userId, emojiId } },
    });

    return this.getReactions(postId, userId, { skipPostCheck: true });
  }
}
