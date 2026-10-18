import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { CommonAuthUserDto } from '@weaver2/common';
import { PostReadPolicy } from '../../board/services/post-read-policy.service';
import { SearchRequestDto, SearchType } from '../dto/search-request.dto';
import { SearchResultDto } from '../dto/search-response.dto';
import { PostDto } from '../../board/dto/post.dto';
import { CommentDto } from '../../board/dto/comment.dto';
import {
  SearchPostIdsQuery,
  CountPostMatchesQuery,
} from '../repositories/search-posts.query';
import {
  SearchCommentIdsQuery,
  CountCommentMatchesQuery,
} from '../repositories/search-comments.query';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readPolicy: PostReadPolicy,
  ) {}

  async search(
    searchDto: SearchRequestDto,
    viewer?: CommonAuthUserDto,
  ): Promise<SearchResultDto> {
    const { q, type, boardId, page = 1, limit = 10 } = searchDto;
    // 읽을 수 있는 게시판의 글·댓글만 찾는다 (PostReadPolicy) — 회원 전용 글 본문이 검색으로 새지 않게
    const boardIds = await this.readPolicy.readableBoardIds(viewer, boardId);

    const skip = (page - 1) * limit;

    let posts: PostDto[] = [];
    let comments: CommentDto[] = [];
    let totalPosts = 0;
    let totalComments = 0;

    const sanitizedQuery = this.sanitizeSearchQuery(q);

    if (type === SearchType.POSTS || type === SearchType.ALL) {
      const [foundPosts, postsCount] = await Promise.all([
        this.fetchPostsByMatch(sanitizedQuery, boardIds, skip, limit),
        CountPostMatchesQuery(this.prisma, sanitizedQuery, boardIds),
      ]);
      posts = foundPosts;
      totalPosts = postsCount;
    }

    if (type === SearchType.COMMENTS || type === SearchType.ALL) {
      const [foundComments, commentsCount] = await Promise.all([
        this.fetchCommentsByMatch(sanitizedQuery, boardIds, skip, limit),
        CountCommentMatchesQuery(this.prisma, sanitizedQuery, boardIds),
      ]);
      comments = foundComments;
      totalComments = commentsCount;
    }

    return {
      posts,
      comments,
      total: { posts: totalPosts, comments: totalComments },
    };
  }

  /**
   * PostgreSQL Full-text Search 쿼리를 위한 문자 정리.
   * 외부 노출(테스트 가시성)을 위해 public.
   */
  sanitizeSearchQuery(query: string): string {
    return query
      .trim()
      .replace(/[&|!()]/g, ' ')
      .replace(/\s+/g, ' & ')
      .trim();
  }

  private async fetchPostsByMatch(
    query: string,
    boardIds: string[],
    skip: number,
    limit: number,
  ): Promise<PostDto[]> {
    if (!query) return [];

    const matched = await SearchPostIdsQuery(
      this.prisma,
      query,
      boardIds,
      skip,
      limit,
    );
    const ids = matched.map((m) => m.id);
    if (ids.length === 0) return [];

    return this.prisma.post.findMany({
      where: { id: { in: ids }, deletedAt: null },
      include: {
        board: true,
        author: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { priority: 'desc' },
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  private async fetchCommentsByMatch(
    query: string,
    boardIds: string[],
    skip: number,
    limit: number,
  ): Promise<CommentDto[]> {
    if (!query) return [];

    const matched = await SearchCommentIdsQuery(
      this.prisma,
      query,
      boardIds,
      skip,
      limit,
    );
    const ids = matched.map((m) => m.id);
    if (ids.length === 0) return [];

    return this.prisma.comment.findMany({
      where: { id: { in: ids } },
      include: {
        author: {
          select: { id: true, username: true, displayName: true },
        },
        post: {
          select: { id: true, title: true, boardId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
