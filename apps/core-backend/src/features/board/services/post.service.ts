import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { PostDto } from '../dto/post.dto';
import { BoardPostsResponseDto } from '../dto/board-posts-response.dto';
import { AdminPostsQueryDto } from '../dto/admin-posts-query.dto';
import { CreatePostCommand } from '../repositories/create-post.command';
import { FindPostByIdQuery } from '../repositories/find-post-by-id.query';
import { FindPinnedPostsQuery } from '../repositories/find-pinned-posts.query';
import { IncrementPostViewCountCommand } from '../repositories/increment-post-view-count.command';
import { UpdatePostCommand } from '../repositories/update-post.command';
import { DeletePostCommand } from '../repositories/delete-post.command';
import { BoardService } from './board.service';
import {
  KeysetPaginationService,
  KeysetRequestDto,
  KeysetResponseDto,
} from '@weaver2/pagination';
import { CommonAuthUserDto } from '@weaver2/common';
import { Prisma } from '@prisma/client';

const POST_INCLUDE = {
  board: true,
  author: { select: { id: true, username: true, displayName: true } },
} as const;

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
  ) {}

  async createPost(
    boardId: string,
    authorId: string | null,
    dto: CreatePostDto,
  ): Promise<PostDto> {
    await this.boardService.findBoardById(boardId);

    const baseData = {
      board: { connect: { id: boardId } },
      title: dto.title,
      content: dto.content,
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
      ...(dto.isSecret !== undefined && { isSecret: dto.isSecret }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.categoryId && { category: { connect: { id: dto.categoryId } } }),
    };

    const createData = authorId
      ? { ...baseData, author: { connect: { id: authorId } } }
      : baseData;

    const post = await CreatePostCommand(
      this.prisma,
      createData as Prisma.PostCreateInput,
    );
    return post as PostDto;
  }

  async findAllPostsForAdmin(
    dto: AdminPostsQueryDto,
  ): Promise<KeysetResponseDto<PostDto>> {
    const where: Record<string, unknown> = {};

    if (dto.boardId) where.boardId = dto.boardId;
    if (dto.authorId) where.authorId = dto.authorId;
    if (dto.status) where.status = dto.status;
    if (!dto.includeDeleted) where.deletedAt = null;

    return KeysetPaginationService.paginate<PostDto>({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      prisma: this.prisma.post as any,
      preset: dto.preset,
      cursor: dto.cursor,
      limit: dto.limit,
      where,
      include: POST_INCLUDE,
    });
  }

  async findPostsByUserId(
    userId: string,
    dto: KeysetRequestDto,
    authUser?: CommonAuthUserDto,
  ): Promise<KeysetResponseDto<PostDto>> {
    const isSelf = authUser?.isLogin === true && authUser.id === userId;
    const where: Record<string, unknown> = {
      authorId: userId,
      status: 'PUBLISHED',
      deletedAt: null,
      hiddenAt: null,
      ...(!isSelf && { isSecret: false }),
    };

    return KeysetPaginationService.paginate<PostDto>({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      prisma: this.prisma.post as any,
      preset: dto.preset,
      cursor: dto.cursor,
      limit: dto.limit,
      where,
      include: POST_INCLUDE,
    });
  }

  async findAllPostsWithKeyset(
    dto: KeysetRequestDto,
    authUser?: CommonAuthUserDto,
  ): Promise<KeysetResponseDto<PostDto>> {
    const isLoggedIn = authUser?.isLogin === true;
    const where = {
      status: 'PUBLISHED' as const,
      deletedAt: null,
      hiddenAt: null,
      ...(!isLoggedIn && { isSecret: false }),
    };

    return KeysetPaginationService.paginate<PostDto>({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      prisma: this.prisma.post as any,
      preset: dto.preset,
      cursor: dto.cursor,
      limit: dto.limit,
      where,
      include: POST_INCLUDE,
    });
  }

  async findPostsByBoardIdWithKeyset(
    boardId: string,
    dto: KeysetRequestDto,
    authUser?: CommonAuthUserDto,
    categoryId?: string,
  ): Promise<BoardPostsResponseDto> {
    await this.boardService.findBoardById(boardId);

    const isLoggedIn = authUser?.isLogin === true;
    const baseWhere = {
      boardId,
      status: 'PUBLISHED' as const,
      deletedAt: null,
      hiddenAt: null,
      ...(!isLoggedIn && { isSecret: false }),
      ...(categoryId && { categoryId }),
    };

    const pinnedPosts = await FindPinnedPostsQuery(this.prisma, baseWhere);

    const paginated = await KeysetPaginationService.paginate<PostDto>({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      prisma: this.prisma.post as any,
      preset: dto.preset,
      cursor: dto.cursor,
      limit: dto.limit,
      where: { ...baseWhere, isPinned: false },
      include: POST_INCLUDE,
    });

    return {
      ...paginated,
      pinnedPosts: pinnedPosts as PostDto[],
    };
  }

  async findPostById(
    id: string,
    incrementView = false,
    authUser?: CommonAuthUserDto,
  ): Promise<PostDto> {
    const isLoggedIn = authUser?.isLogin === true;
    const whereCondition = {
      id,
      status: 'PUBLISHED' as const,
      deletedAt: null,
      hiddenAt: null,
      ...(!isLoggedIn && { isSecret: false }),
    };

    const post = await FindPostByIdQuery(this.prisma, whereCondition);

    if (!post) {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }

    if (incrementView) {
      await this.incrementViewCount(id);
      post.viewCount = post.viewCount + 1;
    }

    return post as PostDto;
  }

  async incrementViewCount(postId: string): Promise<void> {
    await IncrementPostViewCountCommand(this.prisma, postId);
  }

  async updatePost(id: string, dto: UpdatePostDto): Promise<PostDto> {
    const updatedPost = await UpdatePostCommand(this.prisma, id, dto);
    return updatedPost;
  }

  async deletePost(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await DeletePostCommand(tx, id);
    });
  }
}
