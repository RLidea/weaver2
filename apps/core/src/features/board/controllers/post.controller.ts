import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostService } from '../services/post.service';
import { CommentService } from '../services/comment.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { PostDto } from '../dto/post.dto';
import { CommentDto } from '../dto/comment.dto';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { BoardPermissionService } from '../services/board-permission.service';
import { ActionType } from '@prisma/client';

@ApiTags('Post')
@Controller({ path: 'posts', version: '1' })
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly commentService: CommentService,
    private readonly permissionService: BoardPermissionService,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new post' })
  @ApiStandardResponses({ type: PostDto })
  async createPost(
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostDto> {
    // 쓰기 권한 체크
    await this.permissionService.requirePermission(
      createPostDto.boardId,
      ActionType.WRITE,
      authUser,
      '게시글 작성 권한이 없습니다.',
    );

    return this.postService.createPost(
      createPostDto.boardId,
      authUser?.id,
      createPostDto,
    );
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: '게시글 조회 (boardId 쿼리 파라미터로 필터링 가능)',
  })
  @ApiStandardResponses({ type: PostDto, isArray: true })
  async findPosts(
    @Query('boardId') boardId?: string,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<PostDto[]> {
    if (boardId) {
      // 읽기 권한 체크
      await this.permissionService.requirePermission(
        boardId,
        ActionType.READ,
        authUser,
        '게시글 조회 권한이 없습니다.',
      );

      return this.postService.findAllPostsByBoardId(boardId);
    }
    // TODO: 전체 게시글 조회 메서드 구현 필요
    throw new Error('boardId query parameter is required');
  }

  @Get(':postId')
  @Public()
  @ApiOperation({
    summary: '특정 게시글 조회 (조회수 증가)',
  })
  @ApiStandardResponses({ type: PostDto })
  async findPostById(
    @Param('postId') postId: string,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<PostDto> {
    const post = await this.postService.findPostById(postId, false, authUser);

    // 읽기 권한 체크
    await this.permissionService.requirePermission(
      post.boardId,
      ActionType.READ,
      authUser,
      '게시글 읽기 권한이 없습니다.',
    );

    // 권한이 있으면 조회수 증가
    return this.postService.findPostById(postId, true, authUser);
  }

  @Get(':postId/comments')
  @Public()
  @ApiOperation({ summary: '특정 게시글의 댓글 목록 조회 (페이지네이션)' })
  @ApiStandardResponses({ type: CommentDto, isArray: true })
  async getPostComments(
    @Param('postId') postId: string,
    @Query() paginationDto: PaginationRequestDto,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<PaginationResponseDto<CommentDto>> {
    // 게시글 조회해서 boardId 확인
    const post = await this.postService.findPostById(postId, false, authUser);

    // 읽기 권한 체크 (댓글 조회는 게시글 읽기 권한과 동일)
    await this.permissionService.requirePermission(
      post.boardId,
      ActionType.READ,
      authUser,
      '댓글 조회 권한이 없습니다.',
    );

    return this.commentService.findCommentsByPostIdWithPagination(
      postId,
      paginationDto,
    );
  }

  @Patch(':postId')
  @Public()
  @ApiOperation({ summary: '게시글 수정' })
  @ApiStandardResponses({ type: PostDto })
  async updatePost(
    @Param('postId') postId: string,
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostDto> {
    const post = await this.postService.findPostById(postId, false, authUser);

    // 수정 권한 체크
    await this.permissionService.requireEditPermission(post, authUser);

    return this.postService.updatePost(postId, updatePostDto);
  }

  @Delete(':postId')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post' })
  @ApiStandardResponses({
    status: 204,
    description: 'Post deleted successfully',
  })
  async deletePost(
    @Param('postId') postId: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<void> {
    const post = await this.postService.findPostById(postId, false, authUser);

    // 삭제 권한 체크
    await this.permissionService.requireDeletePermission(post, authUser);

    await this.postService.deletePost(postId);
  }
}
