import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { PostReadPolicy, VISIBLE_POST_WHERE } from './post-read-policy.service';
import {
  KeysetPaginationService,
  KeysetRequestDto,
  KeysetResponseDto,
} from '@weaver2/pagination';
import { CommonAuthUserDto } from '@weaver2/common';
import { Prisma } from '@weaver2/prisma';

const POST_INCLUDE = {
  board: true,
  author: { select: { id: true, username: true, displayName: true } },
} as const;

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
    private readonly readPolicy: PostReadPolicy,
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
    return post;
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
    const where = {
      ...(await this.readPolicy.listWhere(authUser)),
      authorId: userId,
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
    const where = await this.readPolicy.listWhere(authUser);

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

    const baseWhere = {
      ...(await this.readPolicy.listWhere(authUser, boardId)),
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
      pinnedPosts: pinnedPosts,
    };
  }

  /**
   * 보이는 상태(게시됨·안 가림·안 지움)인 글. 읽기 판정은 하지 않는다 —
   * 사용자 요청은 findReadablePost 를, 이미 판정을 거친 내부 경로(댓글 작성 등)가 이것을 쓴다.
   */
  async findPostById(id: string): Promise<PostDto> {
    const post = await FindPostByIdQuery(this.prisma, {
      id,
      ...VISIBLE_POST_WHERE,
    });
    if (!post) {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }
    return post;
  }

  /**
   * 이 사람이 읽을 수 있는 글 (PostReadPolicy). 게시판 READ 가 없으면 403,
   * 글이 없거나 남의 비밀글이면 404.
   */
  async findReadablePost(
    id: string,
    viewer: CommonAuthUserDto | undefined,
    incrementView = false,
  ): Promise<PostDto> {
    const post = await FindPostByIdQuery(this.prisma, { id });
    const verdict = post
      ? await this.readPolicy.check(viewer, post)
      : 'not_found';
    if (verdict === 'forbidden') {
      throw new ForbiddenException('게시글 읽기 권한이 없습니다.');
    }
    if (!post || verdict !== 'ok') {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }

    if (incrementView) {
      await this.incrementViewCount(id);
      post.viewCount = post.viewCount + 1;
    }
    return post;
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
