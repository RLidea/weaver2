import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { CommentDto } from '../dto/comment.dto';
import { CreateCommentCommand } from '../repositories/create-comment.command';
import { FindCommentByIdQuery } from '../repositories/find-comment-by-id.query';
import { FindAllCommentsByPostIdQuery } from '../repositories/find-all-comments-by-post-id.query';
import { UpdateCommentCommand } from '../repositories/update-comment.command';
import { DeleteCommentCommand } from '../repositories/delete-comment.command';
import { PostService } from './post.service';
import {
  KeysetPaginationService,
  KeysetRequestDto,
  KeysetResponseDto,
} from '@weaver2/pagination';
import { KeysetPreset } from '@weaver2/pagination';

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
  ) {}

  async createComment(
    postId: string,
    authorId: string | null,
    dto: CreateCommentDto,
  ): Promise<CommentDto> {
    // Check if post exists
    await this.postService.findPostById(postId);
    const comment = await CreateCommentCommand(
      this.prisma,
      postId,
      authorId,
      dto.content,
    );
    return comment;
  }

  async findAllCommentsByPostId(postId: string): Promise<CommentDto[]> {
    // Check if post exists
    await this.postService.findPostById(postId);
    return FindAllCommentsByPostIdQuery(this.prisma, postId);
  }

  async findCommentsByPostIdWithKeyset(
    postId: string,
    dto: KeysetRequestDto,
  ): Promise<KeysetResponseDto<CommentDto>> {
    await this.postService.findPostById(postId);

    return KeysetPaginationService.paginate<CommentDto>({
      prisma: this.prisma.comment,
      preset: COMMENT_PRESET,
      cursor: dto.cursor,
      limit: dto.limit,
      where: { postId },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
      },
    });
  }

  async findCommentById(id: string): Promise<CommentDto> {
    const comment = await FindCommentByIdQuery(this.prisma, id);
    if (!comment) {
      throw new NotFoundException(`Comment with ID '${id}' not found.`);
    }
    return comment;
  }

  async updateComment(id: string, dto: UpdateCommentDto): Promise<CommentDto> {
    // 권한 체크는 controller에서 BoardPermissionService로 처리됨
    const updatedComment = await UpdateCommentCommand(this.prisma, id, dto);
    return updatedComment;
  }

  async deleteComment(id: string): Promise<void> {
    // 권한 체크는 controller에서 BoardPermissionService로 처리됨
    await DeleteCommentCommand(this.prisma, id);
  }
}
