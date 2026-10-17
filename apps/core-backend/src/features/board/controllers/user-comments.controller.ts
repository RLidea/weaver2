import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentService } from '../services/comment.service';
import { CommentDto } from '../dto/comment.dto';
import {
  ApiKeysetResponse,
  KeysetRequestDto,
  KeysetResponseDto,
} from '@weaver2/pagination';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';

@ApiTags('User Comments')
@Controller({ path: 'users', version: '1' })
export class UserCommentsController {
  constructor(private readonly commentService: CommentService) {}

  @Get(':userId/comments')
  @Public()
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '특정 사용자가 작성한 댓글 목록 조회',
    description:
      '삭제되지 않은 댓글만 반환하며, 어떤 게시글에 달린 댓글인지 post 정보를 포함합니다.',
  })
  @ApiKeysetResponse(CommentDto)
  async findCommentsByUserId(
    @Param('userId') userId: string,
    @Query() keysetDto: KeysetRequestDto,
    @AuthUser() authUser?: CommonAuthUserDto,
  ): Promise<KeysetResponseDto<CommentDto>> {
    return this.commentService.findCommentsByUserId(
      userId,
      keysetDto,
      authUser,
    );
  }
}
