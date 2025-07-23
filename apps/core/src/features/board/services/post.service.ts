import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
    const post = await this.prisma.post.create({
      data: {
        board: { connect: { id: boardId } },
        author: { connect: { id: authorId } },
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

  async findPublicPostsByBoardIdWithPagination(
    boardId: string,
    paginationDto: PaginationRequestDto,
  ): Promise<PaginationResponseDto<PostDto>> {
    // Check if board exists and is public
    const board = await this.boardService.findBoardById(boardId);
    if (!board.isPublic) {
      throw new NotFoundException(`Public board with ID '${boardId}' not found.`);
    }

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
          isSecret: false, // 공개 게시판에서는 비밀글 제외
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
          isSecret: false,
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

  async findPostById(id: string, incrementView = false): Promise<PostDto> {
    const post = await this.prisma.post.findUnique({
      where: { id },
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

  async findPublicPostById(id: string, incrementView = false): Promise<PostDto> {
    const post = await this.prisma.post.findUnique({
      where: { 
        id,
        status: 'PUBLISHED',
        isSecret: false, // 비밀글 제외
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

    if (!post) {
      throw new NotFoundException(`Public post with ID '${id}' not found.`);
    }

    // 게시판이 공개가 아니면 접근 불가
    if (!post.board.isPublic) {
      throw new NotFoundException(`Public post with ID '${id}' not found.`);
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
