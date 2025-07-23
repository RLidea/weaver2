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
import { CommonAuthUserDto } from '@weaver2/common';

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
    authUser?: CommonAuthUserDto,
  ): Promise<PaginationResponseDto<PostDto>> {
    // Check if board exists
    const board = await this.boardService.findBoardById(boardId);

    const isLoggedIn = authUser?.isLogin === true;
    const isPublicBoard = board.isPublic;

    // 비공개 게시판인데 로그인하지 않은 경우
    if (!isPublicBoard && !isLoggedIn) {
      throw new NotFoundException(`Board with ID '${boardId}' not found.`);
    }

    const { skip, take } = PaginationService.getPaginationParams({
      page: paginationDto.page,
      limit: paginationDto.limit,
    });

    const orderBy = PaginationService.parseSort(paginationDto.sort);

    // 로그인하지 않은 사용자는 공개 게시판의 공개 게시글만 조회 가능
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
    authUser?: CommonAuthUserDto
  ): Promise<PostDto> {
    const post = await this.prisma.post.findUnique({
      where: { 
        id,
        status: 'PUBLISHED',
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
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }

    // 접근 권한 검사
    const isLoggedIn = authUser?.isLogin === true;
    const isPublicBoard = post.board.isPublic;
    const isSecretPost = post.isSecret;

    // 비공개 게시판인데 로그인하지 않은 경우
    if (!isPublicBoard && !isLoggedIn) {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }

    // 공개 게시판의 비밀글인데 로그인하지 않은 경우
    if (isPublicBoard && isSecretPost && !isLoggedIn) {
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

  async updatePost(
    id: string,
    authorId: string,
    dto: UpdatePostDto,
  ): Promise<PostDto> {
    const post = await this.findPostById(id, false, { id: authorId, isLogin: true } as CommonAuthUserDto);

    if (post.authorId !== authorId) {
      throw new UnauthorizedException('You are not the author of this post.');
    }

    const updatedPost = await UpdatePostCommand(this.prisma, id, dto);
    return updatedPost;
  }

  async deletePost(id: string, authorId: string): Promise<void> {
    const post = await this.findPostById(id, false, { id: authorId, isLogin: true } as CommonAuthUserDto);

    if (post.authorId !== authorId) {
      throw new UnauthorizedException('You are not the author of this post.');
    }

    await DeletePostCommand(this.prisma, id);
  }
}
