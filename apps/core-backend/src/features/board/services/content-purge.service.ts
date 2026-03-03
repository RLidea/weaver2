import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

export interface PurgeResult {
  purgedBoards: number;
  purgedPosts: number;
  purgedComments: number;
}

@Injectable()
export class ContentPurgeService {
  private readonly logger = new Logger(ContentPurgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 소프트 삭제된 콘텐츠를 영구 삭제합니다.
   * @param olderThanDays - 지정 시 해당 일수보다 오래된 항목만 삭제. 생략 시 전체 삭제.
   */
  async purgeDeletedContent(olderThanDays?: number): Promise<PurgeResult> {
    const cutoff = olderThanDays
      ? new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
      : new Date();

    this.logger.log(
      `Starting content purge. cutoff=${cutoff.toISOString()}, olderThanDays=${olderThanDays ?? 'all'}`,
    );

    return this.prisma.$transaction(async (tx) => {
      let purgedBoards = 0;
      let purgedPosts = 0;
      let purgedComments = 0;

      // ① 삭제 대상 Board ID 조회
      const boardIds = (
        await tx.board.findMany({
          where: { deletedAt: { lte: cutoff } },
          select: { id: true },
        })
      ).map((b) => b.id);

      if (boardIds.length > 0) {
        // ② Board 소속 Post의 Comment 영구 삭제
        const { count: c1 } = await tx.comment.deleteMany({
          where: { post: { boardId: { in: boardIds } } },
        });
        purgedComments += c1;

        // ③ Board 소속 Post 영구 삭제
        const { count: p1 } = await tx.post.deleteMany({
          where: { boardId: { in: boardIds } },
        });
        purgedPosts += p1;

        // ④ Board 영구 삭제
        const { count: b1 } = await tx.board.deleteMany({
          where: { id: { in: boardIds } },
        });
        purgedBoards += b1;
      }

      // ⑤ 삭제 대상 Post ID 조회 (Board 삭제로 이미 처리된 것 제외)
      const postIds = (
        await tx.post.findMany({
          where: { deletedAt: { lte: cutoff } },
          select: { id: true },
        })
      ).map((p) => p.id);

      if (postIds.length > 0) {
        // ⑥ Post 소속 Comment 영구 삭제
        const { count: c2 } = await tx.comment.deleteMany({
          where: { postId: { in: postIds } },
        });
        purgedComments += c2;

        // ⑦ Post 영구 삭제
        const { count: p2 } = await tx.post.deleteMany({
          where: { id: { in: postIds } },
        });
        purgedPosts += p2;
      }

      // ⑧ 삭제 대상 Comment ID 조회
      const commentIds = (
        await tx.comment.findMany({
          where: { deletedAt: { lte: cutoff } },
          select: { id: true },
        })
      ).map((c) => c.id);

      if (commentIds.length > 0) {
        // ⑨ 자식 댓글 parentId null 처리 (orphan 방지)
        await tx.comment.updateMany({
          where: { parentId: { in: commentIds } },
          data: { parentId: null },
        });

        // ⑩ Comment 영구 삭제
        const { count: c3 } = await tx.comment.deleteMany({
          where: { id: { in: commentIds } },
        });
        purgedComments += c3;
      }

      this.logger.log(
        `Purge complete. boards=${purgedBoards}, posts=${purgedPosts}, comments=${purgedComments}`,
      );

      return { purgedBoards, purgedPosts, purgedComments };
    });
  }
}
