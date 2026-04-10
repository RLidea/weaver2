import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { OffsetPaginationService } from '@weaver2/pagination';
import { BoardService } from '../../../../features/board/services/board.service';
import { PostService } from '../../../../features/board/services/post.service';
import { CommentService } from '../../../../features/board/services/comment.service';
import {
  ContentPurgeService,
  PurgeResult,
} from '../../../../features/board/services/content-purge.service';
import { Prisma, PostStatus } from '@prisma/client';
import { BoardPermissionDto } from '../dto/board-permission.dto';
import { AdminContentPostsQueryDto } from '../dto/admin-content-posts-query.dto';
import { AdminContentCommentsQueryDto } from '../dto/admin-content-comments-query.dto';

@Injectable()
export class AdminContentApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
    private readonly postService: PostService,
    private readonly commentService: CommentService,
    private readonly contentPurgeService: ContentPurgeService,
  ) {}

  // ============ Board Management ============
  async getBoardsWithStats() {
    const boards = await this.prisma.board.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const boardsWithStats = await Promise.all(
      boards.map(async (board) => {
        const commentCount = await this.prisma.comment.count({
          where: {
            post: {
              boardId: board.id,
            },
          },
        });

        const recentPosts = await this.prisma.post.count({
          where: {
            boardId: board.id,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            },
          },
        });

        return {
          ...board,
          stats: {
            totalPosts: board._count.posts,
            totalComments: commentCount,
            recentPosts,
          },
        };
      }),
    );

    return boardsWithStats;
  }

  async getBoardDetails(boardId: string) {
    const board = await this.boardService.findBoardById(boardId);
    const permissions = await this.getBoardPermissions(boardId);

    return {
      ...board,
      permissions,
    };
  }

  async getBoardPermissions(boardId: string) {
    const resourcePermissions = await this.prisma.resourcePermission.findMany({
      where: { resourceType: 'board', resourceId: boardId },
      include: {
        allowedGroups: {
          include: { permissionGroup: { select: { id: true, name: true } } },
        },
      },
      orderBy: { action: 'asc' },
    });

    return resourcePermissions.map((rp) => ({
      id: rp.id,
      action: rp.action,
      allowAnonymous: rp.allowAnonymous,
      allowedGroupNames: rp.allowedGroups.map((ag) => ag.permissionGroup.name),
    }));
  }

  async updateBoardPermissions(
    boardId: string,
    permissions: BoardPermissionDto[],
  ) {
    // 기존 ResourcePermission 삭제 (cascade로 allowedGroups도 함께 삭제)
    await this.prisma.resourcePermission.deleteMany({
      where: { resourceType: 'board', resourceId: boardId },
    });

    // 새 ResourcePermission 생성
    for (const permission of permissions) {
      const resourcePermission = await this.prisma.resourcePermission.create({
        data: {
          resourceType: 'board',
          resourceId: boardId,
          action: permission.action,
          allowAnonymous: permission.allowAnonymous || false,
        },
      });

      // allowedGroups 연결
      const groupNames = permission.allowedGroupNames || [];
      if (groupNames.length > 0) {
        const groups = await this.prisma.permissionGroup.findMany({
          where: { name: { in: groupNames } },
          select: { id: true },
        });

        for (const group of groups) {
          await this.prisma.resourcePermissionAllowedGroup.create({
            data: {
              resourcePermissionId: resourcePermission.id,
              permissionGroupId: group.id,
            },
          });
        }
      }
    }

    return this.getBoardPermissions(boardId);
  }

  async deleteBoard(boardId: string) {
    return this.boardService.deleteBoard(boardId);
  }

  // ============ Post Management ============
  async getPosts(options: AdminContentPostsQueryDto) {
    const { boardId, status, search, includeDeleted, ...pagination } = options;

    const where: Prisma.PostWhereInput = includeDeleted
      ? {}
      : { deletedAt: null };
    if (boardId) where.boardId = boardId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    return OffsetPaginationService.buildFromPrisma({
      prisma: this.prisma.post,
      options: pagination,
      where,
      include: {
        board: { select: { id: true, name: true } },
        author: { select: { id: true, username: true, displayName: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async getPostDetails(postId: string) {
    return this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        board: true,
        author: {
          select: { id: true, username: true, displayName: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, username: true, displayName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async updatePostStatus(postId: string, status: PostStatus) {
    return this.prisma.post.update({
      where: { id: postId },
      data: { status },
    });
  }

  async deletePost(postId: string) {
    return this.postService.deletePost(postId);
  }

  // ============ Comment Management ============
  async getComments(options: AdminContentCommentsQueryDto) {
    const { postId, search, includeDeleted, ...pagination } = options;

    const where: Prisma.CommentWhereInput = includeDeleted
      ? {}
      : { deletedAt: null };
    if (postId) where.postId = postId;
    if (search) where.content = { contains: search, mode: 'insensitive' };

    return OffsetPaginationService.buildFromPrisma({
      prisma: this.prisma.comment,
      options: pagination,
      where,
      include: {
        post: { select: { id: true, title: true, boardId: true } },
        author: { select: { id: true, username: true, displayName: true } },
      },
    });
  }

  async deleteComment(commentId: string) {
    return this.commentService.deleteComment(commentId);
  }

  // ============ Statistics ============
  async getContentStats() {
    const [
      totalBoards,
      totalPosts,
      totalComments,
      recentPosts,
      recentComments,
      topBoards,
    ] = await Promise.all([
      this.prisma.board.count(),
      this.prisma.post.count(),
      this.prisma.comment.count(),
      this.prisma.post.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.comment.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.board.findMany({
        where: { deletedAt: null },
        include: {
          _count: {
            select: { posts: true },
          },
        },
        orderBy: {
          posts: {
            _count: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    return {
      overview: {
        totalBoards,
        totalPosts,
        totalComments,
        recentPosts,
        recentComments,
      },
      topBoards: topBoards.map((board) => ({
        id: board.id,
        name: board.name,
        postCount: board._count.posts,
      })),
    };
  }

  async getBoardStats(boardId: string) {
    const [board, totalPosts, totalComments, recentActivity, topPosts] =
      await Promise.all([
        this.prisma.board.findUnique({
          where: { id: boardId, deletedAt: null },
        }),
        this.prisma.post.count({ where: { boardId, deletedAt: null } }),
        this.prisma.comment.count({
          where: { post: { boardId, deletedAt: null } },
        }),
        this.prisma.post.findMany({
          where: {
            boardId,
            deletedAt: null,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.post.findMany({
          where: { boardId, deletedAt: null },
          include: {
            _count: {
              select: { comments: true },
            },
          },
          orderBy: [{ viewCount: 'desc' }, { comments: { _count: 'desc' } }],
          take: 5,
        }),
      ]);

    return {
      board,
      stats: {
        totalPosts,
        totalComments,
      },
      recentActivity,
      topPosts: topPosts.map((post) => ({
        id: post.id,
        title: post.title,
        viewCount: post.viewCount,
        commentCount: post._count.comments,
      })),
    };
  }

  // ============ Content Purge ============
  async purgeDeletedContent(olderThanDays?: number): Promise<PurgeResult> {
    return this.contentPurgeService.purgeDeletedContent(olderThanDays);
  }
}
