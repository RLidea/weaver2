import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FileDto,
  LockAttachableFilesCommand,
  UploadService,
} from '@weaver2/upload';
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
    private readonly uploads: UploadService,
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

    const fileIds = dto.attachmentFileIds ?? [];
    if (fileIds.length > 0 && !authorId) {
      throw new BadRequestException('로그인해야 파일을 붙일 수 있습니다.');
    }

    const post = await this.prisma.$transaction(async (tx) => {
      const created = await CreatePostCommand(
        tx,
        createData as Prisma.PostCreateInput,
      );
      if (authorId) {
        await this.replaceAttachments(tx, created.id, fileIds, authorId);
      }
      return created;
    });
    return this.withAttachments(post);
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
    return this.withAttachments(post);
  }

  async incrementViewCount(postId: string): Promise<void> {
    await IncrementPostViewCountCommand(this.prisma, postId);
  }

  /**
   * 글을 고친다. attachmentFileIds 를 보내면 첨부 목록을 통째로 그것으로 바꾼다 — 새로 붙는 파일은
   * 글 작성자가 올렸고 아무 데도 안 붙은 것만(잠금 뒤 확인). 순서만 바꾸거나 떼는 것은 편집 권한이면 된다.
   */
  async updatePost(
    id: string,
    dto: UpdatePostDto,
    editor: CommonAuthUserDto,
    post: { authorId: string },
  ): Promise<PostDto> {
    const { attachmentFileIds, ...fields } = dto;
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await UpdatePostCommand(tx, id, fields);
      if (attachmentFileIds) {
        const isAuthor = editor.isLogin && editor.id === post.authorId;
        await this.replaceAttachments(
          tx,
          id,
          attachmentFileIds,
          isAuthor ? editor.id : null,
        );
      }
      return row;
    });
    return this.withAttachments(updated);
  }

  /**
   * 첨부 목록을 fileIds 로 맞춘다. 빠진 파일은 관계만 지워 고아로 만든다 — 즉시 지우지 않아
   * 「실수로 뺐다 다시 넣기」가 되고, 보존 기간 뒤 정리된다. 새로 붙는 파일은 attacherId 가 올린 것이어야 하고,
   * attacherId 가 null(작성자가 아닌 편집자)이면 새 파일을 붙일 수 없다.
   */
  private async replaceAttachments(
    tx: Prisma.TransactionClient,
    postId: string,
    fileIds: string[],
    attacherId: string | null,
  ): Promise<void> {
    const current = await tx.postAttachment.findMany({
      where: { postId },
      select: { fileId: true },
    });
    const currentIds = new Set(current.map((a) => a.fileId));
    const added = fileIds.filter((id) => !currentIds.has(id));

    if (added.length > 0) {
      if (!attacherId) {
        throw new ForbiddenException('글 작성자만 파일을 붙일 수 있습니다.');
      }
      await LockAttachableFilesCommand(tx, added, attacherId);
    }

    const keep = new Set(fileIds);
    await tx.postAttachment.deleteMany({
      where: { postId, fileId: { notIn: [...keep] } },
    });
    for (const [position, fileId] of fileIds.entries()) {
      await tx.postAttachment.upsert({
        where: { fileId },
        update: { position },
        create: { fileId, postId, position },
      });
    }
  }

  /** 글 응답에 첨부(순서대로)를 싣는다. 지우거나 가린 파일은 뺀다 */
  private async withAttachments<T extends { id: string }>(
    post: T,
  ): Promise<T & { attachments: FileDto[] }> {
    const rows = await this.prisma.postAttachment.findMany({
      where: { postId: post.id, file: { deletedAt: null, hiddenAt: null } },
      include: { file: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return {
      ...post,
      attachments: rows.map((r) => this.uploads.toDto(r.file)),
    };
  }

  async deletePost(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await DeletePostCommand(tx, id);
    });
  }
}
