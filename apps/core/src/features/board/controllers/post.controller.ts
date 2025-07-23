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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

@ApiTags('Post')
@Controller({ path: 'posts', version: '1' })
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly commentService: CommentService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new post' })
  @ApiStandardResponses({ type: PostDto })
  async createPost(
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostDto> {
    return this.postService.createPost(
      createPostDto.boardId,
      authUser.id,
      createPostDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: '게시글 조회 (boardId 쿼리 파라미터로 필터링 가능)',
  })
  @ApiStandardResponses({ type: PostDto, isArray: true })
  async findPosts(@Query('boardId') boardId?: string): Promise<PostDto[]> {
    if (boardId) {
      return this.postService.findAllPostsByBoardId(boardId);
    }
    // TODO: 전체 게시글 조회 메서드 구현 필요
    throw new Error('boardId query parameter is required');
  }

  @Get(':postId')
  @Public()
  @ApiOperation({ summary: '특정 게시글 조회 (공개 게시글은 비로그인 접근 가능, 조회수 증가)' })
  @ApiStandardResponses({ type: PostDto })
  async findPostById(
    @Param('postId') postId: string,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<PostDto> {
    return this.postService.findPostById(postId, true, authUser); // 조회수 증가
  }

  @Get(':postId/comments')
  @ApiOperation({ summary: '특정 게시글의 댓글 목록 조회 (페이지네이션)' })
  @ApiStandardResponses({ type: CommentDto, isArray: true })
  async getPostComments(
    @Param('postId') postId: string,
    @Query() paginationDto: PaginationRequestDto,
  ): Promise<PaginationResponseDto<CommentDto>> {
    return this.commentService.findCommentsByPostIdWithPagination(
      postId,
      paginationDto,
    );
  }

  @Patch(':postId')
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '게시글 수정' })
  @ApiStandardResponses({ type: PostDto })
  async updatePost(
    @Param('postId') postId: string,
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostDto> {
    return this.postService.updatePost(postId, authUser.id, updatePostDto);
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: 'Delete a post' })
  @ApiStandardResponses({
    status: 204,
    description: 'Post deleted successfully',
  })
  async deletePost(
    @Param('postId') postId: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<void> {
    await this.postService.deletePost(postId, authUser.id);
  }
}
