import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { PostDto } from '../dto/post.dto';
import { UpdatePostCommand } from '../repositories/update-post.command';
import { DeletePostCommand } from '../repositories/delete-post.command';
import { BoardService } from './board.service';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
import { PaginationService } from '@weaver2/pagination';
import { CommonAuthUserDto } from '@weaver2/common';

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
  ) {}

  async createPost(
    boardId: string,
    authorId: string | undefined,
    dto: CreatePostDto,
  ): Promise<PostDto> {
    // Check if board exists
    await this.boardService.findBoardById(boardId);

    const post = await this.prisma.post.create({
      data: {
        board: { connect: { id: boardId } },
        author: authorId ? { connect: { id: authorId } } : undefined,
        title: dto.title,
        content: dto.content,
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
    });
    return post;
  }

  async findAllPostsByBoardId(boardId: string): Promise<PostDto[]> {
    // Check if board exists
    await this.boardService.findBoardById(boardId);
    return this.prisma.post.findMany({
      where: { boardId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        board: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPostsByBoardIdWithPagination(
    boardId: string,
    paginationDto: PaginationRequestDto,
    authUser?: CommonAuthUserDto,
  ): Promise<PaginationResponseDto<PostDto>> {
    // Check if board exists
    await this.boardService.findBoardById(boardId);

    const { skip, take } = PaginationService.getPaginationParams({
      page: paginationDto.page,
      limit: paginationDto.limit,
    });

    const orderBy = PaginationService.parseSort(paginationDto.sort);

    // 로그인하지 않은 사용자는 비밀글 제외
    const isLoggedIn = authUser?.isLogin === true;
    const whereCondition = {
      boardId,
      status: 'PUBLISHED' as const,
      ...(!isLoggedIn && { isSecret: false }),
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        skip,
        take,
        where: whereCondition,
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
        where: whereCondition,
      }),
    ]);

    return PaginationService.buildResponse(
      posts,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
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
      // 로그인하지 않은 사용자는 비밀글 접근 불가
      ...(!isLoggedIn && { isSecret: false }),
    };

    const post = await this.prisma.post.findUnique({
      where: whereCondition,
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
    });

    if (!post) {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }

    // 조회수 증가 (선택적)
    if (incrementView) {
      await this.incrementViewCount(id);
      post.viewCount = post.viewCount + 1;
    }

    return post;
  }

  async incrementViewCount(postId: string): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  }

  async updatePost(id: string, dto: UpdatePostDto): Promise<PostDto> {
    const updatedPost = await UpdatePostCommand(this.prisma, id, dto);
    return updatedPost;
  }

  async deletePost(id: string): Promise<void> {
    await DeletePostCommand(this.prisma, id);
  }
}
