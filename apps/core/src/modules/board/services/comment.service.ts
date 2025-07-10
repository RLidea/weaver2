import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postService: PostService,
  ) {}

  async createComment(
    postId: string,
    authorId: string,
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

  async findCommentById(id: string): Promise<CommentDto> {
    const comment = await FindCommentByIdQuery(this.prisma, id);
    if (!comment) {
      throw new NotFoundException(`Comment with ID '${id}' not found.`);
    }
    return comment;
  }

  async updateComment(
    id: string,
    authorId: string,
    dto: UpdateCommentDto,
  ): Promise<CommentDto> {
    const comment = await this.findCommentById(id);

    if (comment.authorId !== authorId) {
      throw new UnauthorizedException(
        'You are not the author of this comment.',
      );
    }

    const updatedComment = await UpdateCommentCommand(this.prisma, id, dto);
    return updatedComment;
  }

  async deleteComment(id: string, authorId: string): Promise<void> {
    const comment = await this.findCommentById(id);

    if (comment.authorId !== authorId) {
      throw new UnauthorizedException(
        'You are not the author of this comment.',
      );
    }

    await DeleteCommentCommand(this.prisma, id);
  }
}
