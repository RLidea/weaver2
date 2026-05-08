import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
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
  constructor(private readonly prisma: PrismaService) {}

  async search(searchDto: SearchRequestDto): Promise<SearchResultDto> {
    const { q, type, boardId, page = 1, limit = 10 } = searchDto;

    const skip = (page - 1) * limit;

    let posts: PostDto[] = [];
    let comments: CommentDto[] = [];
    let totalPosts = 0;
    let totalComments = 0;

    const sanitizedQuery = this.sanitizeSearchQuery(q);

    if (type === SearchType.POSTS || type === SearchType.ALL) {
      const [foundPosts, postsCount] = await Promise.all([
        this.fetchPostsByMatch(sanitizedQuery, boardId, skip, limit),
        CountPostMatchesQuery(this.prisma, sanitizedQuery, boardId),
      ]);
      posts = foundPosts;
      totalPosts = postsCount;
    }

    if (type === SearchType.COMMENTS || type === SearchType.ALL) {
      const [foundComments, commentsCount] = await Promise.all([
        this.fetchCommentsByMatch(sanitizedQuery, boardId, skip, limit),
        CountCommentMatchesQuery(this.prisma, sanitizedQuery, boardId),
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
    boardId: string | undefined,
    skip: number,
    limit: number,
  ): Promise<PostDto[]> {
    if (!query) return [];

    const matched = await SearchPostIdsQuery(
      this.prisma,
      query,
      boardId,
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
    boardId: string | undefined,
    skip: number,
    limit: number,
  ): Promise<CommentDto[]> {
    if (!query) return [];

    const matched = await SearchCommentIdsQuery(
      this.prisma,
      query,
      boardId,
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
