import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { PostDto } from '../dto/post.dto';
import { UpdatePostCommand } from '../repositories/update-post.command';
import { DeletePostCommand } from '../repositories/delete-post.command';
import { BoardService } from './board.service';
import {
  KeysetPaginationService,
  KeysetRequestDto,
  KeysetResponseDto,
} from '@weaver2/pagination';
import { CommonAuthUserDto } from '@weaver2/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
  ) {}

  async createPost(
    boardId: string,
    authorId: string | null,
    dto: CreatePostDto,
  ): Promise<PostDto> {
    // Check if board exists
    await this.boardService.findBoardById(boardId);

    const baseData = {
      board: { connect: { id: boardId } },
      title: dto.title,
      content: dto.content,
    };

    const createData = authorId
      ? { ...baseData, author: { connect: { id: authorId } } }
      : baseData;

    const post = await this.prisma.post.create({
      data: createData as Prisma.PostCreateInput,
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
    return post as PostDto;
  }

  async findAllPostsWithKeyset(
    dto: KeysetRequestDto,
    authUser?: CommonAuthUserDto,
  ): Promise<KeysetResponseDto<PostDto>> {
    const isLoggedIn = authUser?.isLogin === true;
    const where = {
      status: 'PUBLISHED' as const,
      ...(!isLoggedIn && { isSecret: false }),
    };

    return KeysetPaginationService.paginate<PostDto>({
      prisma: this.prisma.post as any,
      preset: dto.preset,
      cursor: dto.cursor,
      limit: dto.limit,
      where,
      include: {
        board: true,
        author: { select: { id: true, username: true, displayName: true } },
      },
    });
  }

  async findPostsByBoardIdWithKeyset(
    boardId: string,
    dto: KeysetRequestDto,
    authUser?: CommonAuthUserDto,
  ): Promise<KeysetResponseDto<PostDto>> {
    await this.boardService.findBoardById(boardId);

    const isLoggedIn = authUser?.isLogin === true;
    const where = {
      boardId,
      status: 'PUBLISHED' as const,
      ...(!isLoggedIn && { isSecret: false }),
    };

    return KeysetPaginationService.paginate<PostDto>({
      prisma: this.prisma.post as any,
      preset: dto.preset,
      cursor: dto.cursor,
      limit: dto.limit,
      where,
      include: {
        board: true,
        author: { select: { id: true, username: true, displayName: true } },
      },
    });
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
