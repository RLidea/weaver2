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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentService } from '../services/comment.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { CommentDto } from '../dto/comment.dto';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';

@ApiTags('Comment')
@Controller({ path: 'comments', version: '1' })
@UseGuards(JwtAuthGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new comment' })
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
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiStandardResponses({
    status: 204,
    description: 'Comment deleted successfully',
  })
  async deleteComment(
    @Param('commentId') commentId: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<void> {
    await this.commentService.deleteComment(commentId, authUser.id);
  }
}
