import {
  BadRequestException,
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
import { CommentService } from '../services/comment.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { CommentDto } from '../dto/comment.dto';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { Public } from '@weaver2/common/decorator/public.decorator';
import {
  BoardPermissionService,
  BoardActionType,
} from '../services/board-permission.service';
import { PostService } from '../services/post.service';

@ApiTags('Comment')
@Controller({ path: 'comments', version: '1' })
@UseGuards(JwtAuthGuard)
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly postService: PostService,
    private readonly permissionService: BoardPermissionService,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '댓글 생성' })
  @ApiStandardResponses({ type: CommentDto })
  async createComment(
    @Body() createCommentDto: CreateCommentDto,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<CommentDto> {
    // 게시글 조회해서 boardId 확인
    const post = await this.postService.findPostById(
      createCommentDto.postId,
      false,
      authUser,
    );

    // 댓글 작성 권한 체크
    await this.permissionService.requirePermission(
      post.boardId,
      BoardActionType.COMMENT,
      authUser,
      '댓글 작성 권한이 없습니다.',
    );

    return this.commentService.createComment(
      createCommentDto.postId,
      authUser?.id || null,
      createCommentDto,
    );
  }

  @Get()
  @Public()
  @ApiOperation({ summary: '댓글 조회 (postId 쿼리 파라미터로 필터링 가능)' })
  @ApiStandardResponses({ type: CommentDto, isArray: true })
  async findComments(
    @Query('postId') postId?: string,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<CommentDto[]> {
    if (postId) {
      // 게시글 조회해서 boardId 확인
      const post = await this.postService.findPostById(postId, false, authUser);

      // 읽기 권한 체크 (댓글 조회는 게시글 읽기 권한과 동일)
      await this.permissionService.requirePermission(
        post.boardId,
        BoardActionType.READ,
        authUser,
        '댓글 조회 권한이 없습니다.',
      );

      return this.commentService.findAllCommentsByPostId(postId);
    }
    throw new BadRequestException('postId query parameter is required');
  }

  @Get(':commentId')
  @Public()
  @ApiOperation({ summary: '특정 댓글 조회' })
  @ApiStandardResponses({ type: CommentDto })
  async findCommentById(
    @Param('commentId') commentId: string,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<CommentDto> {
    const comment = await this.commentService.findCommentById(commentId);

    // 게시글 조회해서 boardId 확인
    const post = await this.postService.findPostById(
      comment.postId,
      false,
      authUser,
    );

    // 읽기 권한 체크
    await this.permissionService.requirePermission(
      post.boardId,
      BoardActionType.READ,
      authUser,
      '댓글 조회 권한이 없습니다.',
    );

    return comment;
  }

  @Patch(':commentId')
  @Public()
  @ApiOperation({ summary: '댓글 수정' })
  @ApiStandardResponses({ type: CommentDto })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<CommentDto> {
    const comment = await this.commentService.findCommentById(commentId);

    // 게시글 조회해서 boardId 확인
    const post = await this.postService.findPostById(
      comment.postId,
      false,
      authUser,
    );

    // 수정 권한 체크 (댓글도 게시글과 동일한 수정 권한 체계 적용)
    await this.permissionService.requireEditPermission(
      { authorId: comment.authorId, boardId: post.boardId },
      authUser,
    );

    return this.commentService.updateComment(commentId, updateCommentDto);
  }

  @Delete(':commentId')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '댓글 삭제' })
  @ApiStandardResponses({
    status: 204,
    description: 'Comment deleted successfully',
  })
  async deleteComment(
    @Param('commentId') commentId: string,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<void> {
    const comment = await this.commentService.findCommentById(commentId);

    // 게시글 조회해서 boardId 확인
    const post = await this.postService.findPostById(
      comment.postId,
      false,
      authUser,
    );

    // 삭제 권한 체크
    await this.permissionService.requireDeletePermission(
      { authorId: comment.authorId, boardId: post.boardId },
      authUser,
    );

    await this.commentService.deleteComment(commentId);
  }
}
