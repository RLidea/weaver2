import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentDto } from './dto/comment.dto';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';

@ApiTags('Comments')
@Controller({ path: 'boards/:boardId/posts/:postId/comments', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '새 댓글 생성' })
  @ApiStandardResponses({ type: CommentDto })
  async createComment(
    @Param('postId') postId: string,
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() createCommentDto: CreateCommentDto,
  ): Promise<CommentDto> {
    return this.commentService.createComment(
      postId,
      authUser.id,
      createCommentDto,
    );
  }

  @Get()
  @ApiOperation({ summary: '특정 게시글의 모든 댓글 조회' })
  @ApiStandardResponses({ type: CommentDto, isArray: true })
  async findAllCommentsByPostId(
    @Param('postId') postId: string,
  ): Promise<CommentDto[]> {
    return this.commentService.findAllCommentsByPostId(postId);
  }

  @Get(':commentId')
  @ApiOperation({ summary: '특정 댓글 조회' })
  @ApiStandardResponses({ type: CommentDto })
  async findCommentById(
    @Param('commentId') commentId: string,
  ): Promise<CommentDto> {
    return this.commentService.findCommentById(commentId);
  }

  @Patch(':commentId')
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '댓글 수정' })
  @ApiStandardResponses({ type: CommentDto })
  async updateComment(
    @Param('commentId') commentId: string,
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() updateCommentDto: UpdateCommentDto,
  ): Promise<CommentDto> {
    return this.commentService.updateComment(
      commentId,
      authUser.id,
      updateCommentDto,
    );
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '댓글 삭제' })
  @ApiStandardResponses({ status: 204, description: '댓글 삭제 성공' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<void> {
    await this.commentService.deleteComment(commentId, authUser.id);
  }
}
