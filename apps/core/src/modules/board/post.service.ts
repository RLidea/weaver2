import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostDto } from './dto/post.dto';
import { CreatePostCommand } from './repositories/create-post.command';
import { FindPostByIdQuery } from './repositories/find-post-by-id.query';
import { FindAllPostsByBoardIdQuery } from './repositories/find-all-posts-by-board-id.query';
import { UpdatePostCommand } from './repositories/update-post.command';
import { DeletePostCommand } from './repositories/delete-post.command';
import { BoardService } from './board.service';

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
  ) {}

  async createPost(
    boardId: string,
    authorId: string,
    dto: CreatePostDto,
  ): Promise<PostDto> {
    // Check if board exists
    await this.boardService.findBoardById(boardId);
    const post = await CreatePostCommand(
      this.prisma,
      boardId,
      authorId,
      dto.title,
      dto.content,
    );
    return post;
  }

  async findAllPostsByBoardId(boardId: string): Promise<PostDto[]> {
    // Check if board exists
    await this.boardService.findBoardById(boardId);
    return FindAllPostsByBoardIdQuery(this.prisma, boardId);
  }

  async findPostById(id: string): Promise<PostDto> {
    const post = await FindPostByIdQuery(this.prisma, id);
    if (!post) {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }
    return post;
  }

  async updatePost(
    id: string,
    authorId: string,
    dto: UpdatePostDto,
  ): Promise<PostDto> {
    const post = await this.findPostById(id);

    if (post.authorId !== authorId) {
      throw new UnauthorizedException('You are not the author of this post.');
    }

    const updatedPost = await UpdatePostCommand(this.prisma, id, dto);
    return updatedPost;
  }

  async deletePost(id: string, authorId: string): Promise<void> {
    const post = await this.findPostById(id);

    if (post.authorId !== authorId) {
      throw new UnauthorizedException('You are not the author of this post.');
    }

    await DeletePostCommand(this.prisma, id);
  }
}
