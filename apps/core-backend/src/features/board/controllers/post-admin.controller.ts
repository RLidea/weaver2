import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostService } from '../services/post.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { PostDto } from '../dto/post.dto';
import { ApiKeysetResponse, KeysetResponseDto } from '@weaver2/pagination';
import { RequirePermission } from '../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AdminPostsQueryDto } from '../dto/admin-posts-query.dto';

@ApiTags('Admin - Post')
@Controller({ path: 'admin/posts', version: '1' })
@UseGuards(JwtAuthGuard)
export class PostAdminController {
  constructor(private readonly postService: PostService) {}

  @Get()
  @RequirePermission(PERMISSIONS.POST.READ_ALL)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '전체 게시글 목록 조회 (관리자 전용)',
    description:
      '모든 게시판의 게시글을 조회합니다. boardId, authorId, status 필터 및 소프트 삭제 포함 여부를 지정할 수 있습니다.',
  })
  @ApiKeysetResponse(PostDto)
  async findAllPosts(
    @Query() query: AdminPostsQueryDto,
  ): Promise<KeysetResponseDto<PostDto>> {
    return this.postService.findAllPostsForAdmin(query);
  }
}
