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
import { KeysetRequestDto, KeysetResponseDto } from '@weaver2/pagination';
import { Public } from '@weaver2/common/decorator/public.decorator';
import {
  BoardPermissionService,
  BoardActionType,
} from '../services/board-permission.service';

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
  @ApiOperation({ summary: '게시글 생성' })
  @ApiStandardResponses({ type: PostDto })
  async createPost(
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostDto> {
    // 쓰기 권한 체크
    await this.permissionService.requirePermission(
      createPostDto.boardId,
      BoardActionType.WRITE,
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
    summary: '게시글 목록 조회 (boardId로 필터링 가능, preset으로 정렬 선택)',
  })
  @ApiStandardResponses({ type: PostDto, isArray: true })
  async findPosts(
    @Query('boardId') boardId?: string,
    @Query() keysetDto?: KeysetRequestDto,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<KeysetResponseDto<PostDto>> {
    const dto = keysetDto ?? new KeysetRequestDto();

    if (boardId) {
      await this.permissionService.requirePermission(
        boardId,
        BoardActionType.READ,
        authUser,
        '게시글 조회 권한이 없습니다.',
      );
      return this.postService.findPostsByBoardIdWithKeyset(
        boardId,
        dto,
        authUser,
      );
    }

    return this.postService.findAllPostsWithKeyset(dto, authUser);
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
      BoardActionType.READ,
      authUser,
      '게시글 읽기 권한이 없습니다.',
    );

    // 권한이 있으면 조회수 증가
    return this.postService.findPostById(postId, true, authUser);
  }

  @Get(':postId/comments')
  @Public()
  @ApiOperation({ summary: '특정 게시글의 댓글 목록 조회 (시간순 무한스크롤)' })
  @ApiStandardResponses({ type: CommentDto, isArray: true })
  async getPostComments(
    @Param('postId') postId: string,
    @Query() keysetDto: KeysetRequestDto,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<KeysetResponseDto<CommentDto>> {
    // 게시글 조회해서 boardId 확인
    const post = await this.postService.findPostById(postId, false, authUser);

    // 읽기 권한 체크 (댓글 조회는 게시글 읽기 권한과 동일)
    await this.permissionService.requirePermission(
      post.boardId,
      BoardActionType.READ,
      authUser,
      '댓글 조회 권한이 없습니다.',
    );

    return this.commentService.findCommentsByPostIdWithKeyset(
      postId,
      keysetDto,
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
  @ApiOperation({ summary: '게시글 삭제' })
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
