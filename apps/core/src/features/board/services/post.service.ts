import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { PostDto } from '../dto/post.dto';
import { CreatePostCommand } from '../repositories/create-post.command';
import { FindPostByIdQuery } from '../repositories/find-post-by-id.query';
import { FindAllPostsByBoardIdQuery } from '../repositories/find-all-posts-by-board-id.query';
import { UpdatePostCommand } from '../repositories/update-post.command';
import { DeletePostCommand } from '../repositories/delete-post.command';
import { BoardService } from './board.service';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
import { PaginationService } from '@weaver2/pagination';

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

  async findPostsByBoardIdWithPagination(
    boardId: string,
    paginationDto: PaginationRequestDto,
  ): Promise<PaginationResponseDto<PostDto>> {
    // Check if board exists
    await this.boardService.findBoardById(boardId);

    const { skip, take } = PaginationService.getPaginationParams({
      page: paginationDto.page,
      limit: paginationDto.limit,
    });

    const orderBy = PaginationService.parseSort(paginationDto.sort);

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        skip,
        take,
        where: {
          boardId,
          status: 'PUBLISHED',
        },
        orderBy,
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
      }),
      this.prisma.post.count({
        where: {
          boardId,
          status: 'PUBLISHED',
        },
      }),
    ]);

    return PaginationService.buildResponse(
      posts,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
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
