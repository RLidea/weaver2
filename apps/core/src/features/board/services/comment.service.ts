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
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
import { PaginationService } from '@weaver2/pagination';

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

  async findCommentsByPostIdWithPagination(
    postId: string,
    paginationDto: PaginationRequestDto,
  ): Promise<PaginationResponseDto<CommentDto>> {
    // Check if post exists
    await this.postService.findPostById(postId);

    const { skip, take } = PaginationService.getPaginationParams({
      page: paginationDto.page,
      limit: paginationDto.limit,
    });

    const orderBy = PaginationService.parseSort(paginationDto.sort);

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        skip,
        take,
        where: {
          postId,
        },
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.comment.count({
        where: {
          postId,
        },
      }),
    ]);

    return PaginationService.buildResponse(
      comments,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
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
