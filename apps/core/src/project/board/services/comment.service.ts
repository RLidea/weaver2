import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { CommentDto } from '../dto/comment.dto';
import { CreateCommentCommand } from '../repositories/create-comment.command';
import { FindCommentByIdQuery } from '../repositories/find-comment-by-id.query';
import {
  FindAllCommentsByPostIdQuery,
  COMMENT_CHILDREN_INCLUDE,
} from '../repositories/find-all-comments-by-post-id.query';
import { UpdateCommentCommand } from '../repositories/update-comment.command';
import { DeleteCommentCommand } from '../repositories/delete-comment.command';
import { PostService } from './post.service';
import {
  KeysetPaginationService,
  KeysetPreset,
  KeysetRequestDto,
  KeysetResponseDto,
} from '@weaver2/pagination';
import { AdminCommentsQueryDto } from '../dto/admin-comments-query.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEventDto } from '../../../features/notification/dto/notification-event.dto';

// 댓글은 시간순(오름차순) 고정 정렬 — 전역 KEYSET_PRESETS에 등록하지 않음
const COMMENT_PRESET: KeysetPreset = {
  name: 'created-at',
  fields: [
    { field: 'createdAt', direction: 'asc', type: 'date' },
    { field: 'id', direction: 'asc', type: 'string' },
  ],
};

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postService: PostService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createComment(
    postId: string,
    authorId: string | null,
    dto: CreateCommentDto,
  ): Promise<CommentDto> {
    await this.postService.findPostById(postId);

    // parentId 유효성 검증: 같은 게시글의 댓글인지, 삭제되지 않았는지 확인
    if (dto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { postId: true, deletedAt: true },
      });
      if (!parentComment) {
        throw new NotFoundException(
          `Parent comment with ID '${dto.parentId}' not found.`,
        );
      }
      if (parentComment.deletedAt !== null) {
        throw new BadRequestException(
          '삭제된 댓글에는 답글을 작성할 수 없습니다.',
        );
      }
      if (parentComment.postId !== postId) {
        throw new BadRequestException(
          '답글 대상 댓글이 같은 게시글에 속하지 않습니다.',
        );
      }
    }

    const comment = await CreateCommentCommand(
      this.prisma,
      postId,
      authorId,
      dto.content,
      dto.parentId,
    );

    if (authorId) {
      // 대댓글: 부모 댓글 작성자에게 알림
      if (dto.parentId) {
        const parentComment = await this.prisma.comment.findUnique({
          where: { id: dto.parentId },
          select: { authorId: true },
        });
        if (parentComment?.authorId) {
          const event: NotificationEventDto = {
            recipientId: parentComment.authorId,
            actorId: authorId,
            type: 'REPLY',
            title: '새 답글이 달렸습니다',
            body: dto.content.slice(0, 100),
            link: `/posts/${postId}`,
          };
          this.eventEmitter.emit('notification.created', event);
        }
      } else {
        // 댓글: 게시글 작성자에게 알림
        const post = await this.prisma.post.findUnique({
          where: { id: postId },
          select: { authorId: true },
        });
        if (post?.authorId) {
          const event: NotificationEventDto = {
            recipientId: post.authorId,
            actorId: authorId,
            type: 'COMMENT',
            title: '새 댓글이 달렸습니다',
            body: dto.content.slice(0, 100),
            link: `/posts/${postId}`,
          };
          this.eventEmitter.emit('notification.created', event);
        }
      }
    }

    return comment as CommentDto;
  }

  async findCommentsByUserId(
    userId: string,
    dto: KeysetRequestDto,
  ): Promise<KeysetResponseDto<CommentDto>> {
    return KeysetPaginationService.paginate<CommentDto>({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      prisma: this.prisma.comment as any,
      preset: COMMENT_PRESET,
      cursor: dto.cursor,
      limit: dto.limit,
      where: { authorId: userId, deletedAt: null },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        post: { select: { id: true, title: true, boardId: true } },
      },
    });
  }

  async findAllCommentsForAdmin(
    dto: AdminCommentsQueryDto,
  ): Promise<KeysetResponseDto<CommentDto>> {
    const where: Record<string, unknown> = {};

    if (dto.postId) where.postId = dto.postId;
    if (dto.authorId) where.authorId = dto.authorId;
    if (!dto.includeDeleted) where.deletedAt = null;

    return KeysetPaginationService.paginate<CommentDto>({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      prisma: this.prisma.comment as any,
      preset: COMMENT_PRESET,
      cursor: dto.cursor,
      limit: dto.limit,
      where,
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        post: { select: { id: true, title: true, boardId: true } },
      },
    });
  }

  async findAllCommentsByPostId(postId: string): Promise<CommentDto[]> {
    await this.postService.findPostById(postId);
    return FindAllCommentsByPostIdQuery(this.prisma, postId) as Promise<
      CommentDto[]
    >;
  }

  async findCommentsByPostIdWithKeyset(
    postId: string,
    dto: KeysetRequestDto,
  ): Promise<KeysetResponseDto<CommentDto>> {
    await this.postService.findPostById(postId);

    // 루트 댓글(parentId: null)만 페이지네이션, children은 include로 함께 로드
    return KeysetPaginationService.paginate<CommentDto>({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      prisma: this.prisma.comment as any,
      preset: COMMENT_PRESET,
      cursor: dto.cursor,
      limit: dto.limit,
      where: { postId, parentId: null, deletedAt: null, hiddenAt: null },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        ...COMMENT_CHILDREN_INCLUDE,
      },
    });
  }

  async findCommentById(id: string): Promise<CommentDto> {
    const comment = await FindCommentByIdQuery(this.prisma, id);
    if (!comment) {
      throw new NotFoundException(`Comment with ID '${id}' not found.`);
    }
    return comment as CommentDto;
  }

  async updateComment(id: string, dto: UpdateCommentDto): Promise<CommentDto> {
    const updatedComment = await UpdateCommentCommand(this.prisma, id, dto);
    return updatedComment as CommentDto;
  }

  async deleteComment(id: string): Promise<void> {
    await DeleteCommentCommand(this.prisma, id);
  }
}
