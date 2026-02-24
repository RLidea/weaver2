import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentService } from '../services/comment.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { CommentDto } from '../dto/comment.dto';
import { KeysetResponseDto } from '@weaver2/pagination';
import { RequirePermission } from '../../permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AdminCommentsQueryDto } from '../dto/admin-comments-query.dto';

@ApiTags('Admin - Comment')
@Controller({ path: 'admin/comments', version: '1' })
@UseGuards(JwtAuthGuard)
export class CommentAdminController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @RequirePermission(PERMISSIONS.COMMENT.READ)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '전체 댓글 목록 조회 (관리자 전용)',
    description:
      '모든 게시글의 댓글을 평탄화된 목록으로 조회합니다. postId, authorId 필터 및 소프트 삭제 포함 여부를 지정할 수 있습니다.',
  })
  @ApiStandardResponses({ type: CommentDto, isArray: true })
  async findAllComments(
    @Query() query: AdminCommentsQueryDto,
  ): Promise<KeysetResponseDto<CommentDto>> {
    return this.commentService.findAllCommentsForAdmin(query);
  }
}
