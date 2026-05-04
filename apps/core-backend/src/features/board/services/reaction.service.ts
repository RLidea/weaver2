import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import {
  PostReactionsResponseDto,
  ReactionSummaryDto,
} from '../dto/post-reactions-response.dto';
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
  ): Promise<PostReactionsResponseDto> {
    // 게시글 존재 확인
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post)
      throw new NotFoundException(`Post with ID '${postId}' not found.`);

    // 이모지별 카운트 집계
    const grouped = await this.prisma.postReaction.groupBy({
      by: ['emojiId'],
      where: { postId },
      _count: { id: true },
    });

    if (grouped.length === 0) {
      return { reactions: [], totalCount: 0 };
    }

    // 이모지 정보 조회
    const emojiIds = grouped.map((g) => g.emojiId);
    const emojis = await this.prisma.emoji.findMany({
      where: { id: { in: emojiIds } },
    });
    const emojiMap = new Map(emojis.map((e) => [e.id, e]));

    // 현재 유저의 리액션 목록
    const userReactedIds = new Set<string>();
    if (userId) {
      const userReactions = await this.prisma.postReaction.findMany({
        where: { postId, userId },
        select: { emojiId: true },
      });
      userReactions.forEach((r) => userReactedIds.add(r.emojiId));
    }

    const reactions: ReactionSummaryDto[] = grouped
      .map((g) => {
        const emoji = emojiMap.get(g.emojiId);
        if (!emoji) return null;
        return {
          emoji: {
            id: emoji.id,
            code: emoji.code,
            name: emoji.name,
            unicode: emoji.unicode,
            imageUrl: emoji.imageUrl,
            isActive: emoji.isActive,
            createdAt: emoji.createdAt,
          },
          count: g._count.id,
          reacted: userReactedIds.has(g.emojiId),
        };
      })
      .filter((r): r is ReactionSummaryDto => r !== null);

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

    return this.getReactions(postId, userId);
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

    return this.getReactions(postId, userId);
  }
}
