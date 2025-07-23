import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { SearchRequestDto, SearchType } from '../dto/search-request.dto';
import { SearchResultDto } from '../dto/search-response.dto';
import { PostDto } from '../../board/dto/post.dto';
import { CommentDto } from '../../board/dto/comment.dto';

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

    // Sanitize search query for PostgreSQL Full-text Search
    const sanitizedQuery = this.sanitizeSearchQuery(q);

    if (type === SearchType.POSTS || type === SearchType.ALL) {
      const [foundPosts, postsCount] = await Promise.all([
        this.searchPostsWithFullText(sanitizedQuery, boardId, skip, limit),
        this.countPostsWithFullText(sanitizedQuery, boardId),
      ]);
      posts = foundPosts;
      totalPosts = postsCount;
    }

    if (type === SearchType.COMMENTS || type === SearchType.ALL) {
      const [foundComments, commentsCount] = await Promise.all([
        this.searchCommentsWithFullText(sanitizedQuery, boardId, skip, limit),
        this.countCommentsWithFullText(sanitizedQuery, boardId),
      ]);
      comments = foundComments;
      totalComments = commentsCount;
    }

    return {
      posts,
      comments,
      total: {
        posts: totalPosts,
        comments: totalComments,
      },
    };
  }

  private sanitizeSearchQuery(query: string): string {
    // PostgreSQL Full-text Search 쿼리를 위한 문자 정리
    return query
      .trim()
      .replace(/[&|!()]/g, ' ') // 특수문자 제거
      .replace(/\s+/g, ' & ') // 공백을 AND 연산자로 변경
      .trim();
  }

  private async searchPostsWithFullText(
    query: string,
    boardId: string | undefined,
    skip: number,
    limit: number,
  ): Promise<PostDto[]> {
    // 빈 쿼리 처리
    if (!query || query.trim() === '') {
      return [];
    }

    const rawResults = await this.prisma.$queryRawUnsafe(
      `
      SELECT 
        p.*,
        ts_rank(
          to_tsvector('simple', p.title || ' ' || p.content), 
          to_tsquery('simple', $1)
        ) as rank
      FROM "Post" p
      WHERE 
        to_tsvector('simple', p.title || ' ' || p.content) @@ to_tsquery('simple', $1)
        AND p.status = 'PUBLISHED'
        AND p."isSecret" = false
        ${boardId ? `AND p."boardId" = '${boardId}'` : ''}
      ORDER BY 
        p."isPinned" DESC,
        p.priority DESC,
        rank DESC,
        p."viewCount" DESC,
        p."createdAt" DESC
      LIMIT $2 OFFSET $3
    `,
      query,
      limit,
      skip,
    );

    // 관계 데이터를 포함한 완전한 데이터 조회
    const postIds = (rawResults as { id: string }[]).map((result) => result.id);

    if (postIds.length === 0) return [];

    return this.prisma.post.findMany({
      where: {
        id: { in: postIds },
      },
      include: {
        board: true,
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
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

  private async countPostsWithFullText(
    query: string,
    boardId: string | undefined,
  ): Promise<number> {
    if (!query || query.trim() === '') {
      return 0;
    }

    const result = await this.prisma.$queryRawUnsafe(
      `
      SELECT COUNT(*) as count
      FROM "Post" p
      WHERE 
        to_tsvector('simple', p.title || ' ' || p.content) @@ to_tsquery('simple', $1)
        AND p.status = 'PUBLISHED'
        AND p."isSecret" = false
        ${boardId ? `AND p."boardId" = '${boardId}'` : ''}
    `,
      query,
    );

    return Number((result as { count: number }[])[0].count);
  }

  private async searchCommentsWithFullText(
    query: string,
    boardId: string | undefined,
    skip: number,
    limit: number,
  ): Promise<CommentDto[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    const rawResults = await this.prisma.$queryRawUnsafe(
      `
      SELECT 
        c.*,
        ts_rank(
          to_tsvector('simple', c.content), 
          to_tsquery('simple', $1)
        ) as rank
      FROM "Comment" c
      ${boardId ? `JOIN "Post" p ON c."postId" = p.id` : ''}
      WHERE 
        to_tsvector('simple', c.content) @@ to_tsquery('simple', $1)
        ${boardId ? `AND p."boardId" = '${boardId}'` : ''}
      ORDER BY 
        rank DESC,
        c."createdAt" DESC
      LIMIT $2 OFFSET $3
    `,
      query,
      limit,
      skip,
    );

    const commentIds = (rawResults as { id: string }[]).map(
      (result) => result.id,
    );

    if (commentIds.length === 0) return [];

    return this.prisma.comment.findMany({
      where: {
        id: { in: commentIds },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            boardId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async countCommentsWithFullText(
    query: string,
    boardId: string | undefined,
  ): Promise<number> {
    if (!query || query.trim() === '') {
      return 0;
    }

    const result = await this.prisma.$queryRawUnsafe(
      `
      SELECT COUNT(*) as count
      FROM "Comment" c
      ${boardId ? `JOIN "Post" p ON c."postId" = p.id` : ''}
      WHERE 
        to_tsvector('simple', c.content) @@ to_tsquery('simple', $1)
        ${boardId ? `AND p."boardId" = '${boardId}'` : ''}
    `,
      query,
    );

    return Number((result as { count: number }[])[0].count);
  }
}
