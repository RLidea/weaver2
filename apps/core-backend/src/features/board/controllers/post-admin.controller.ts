import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostService } from '../services/post.service';
import { PostRevisionService } from '../services/post-revision.service';
import { PostDto } from '../dto/post.dto';
import {
  PostRevisionDto,
  PostRevisionSummaryDto,
} from '../dto/post-revision.dto';
import { ApiKeysetResponse, KeysetResponseDto } from '@weaver2/pagination';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { RequirePermission } from '../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AdminPostsQueryDto } from '../dto/admin-posts-query.dto';

@ApiTags('Admin - Post')
@Controller({ path: 'admin/posts', version: '1' })
export class PostAdminController {
  constructor(
    private readonly postService: PostService,
    private readonly postRevisionService: PostRevisionService,
  ) {}

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

  @Get(':postId/revisions')
  @RequirePermission(PERMISSIONS.POST.READ_ALL)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({
    summary: '게시글 판 목록 (관리자 전용)',
    description:
      '게시판의 keepRevisions 가 켜져 있을 때 쌓인 판을 최신 순으로 돌려줍니다. 본문은 판 전문 경로에서 받습니다.',
  })
  @ApiStandardResponses({ type: PostRevisionSummaryDto, isArray: true })
  async findRevisions(
    @Param('postId') postId: string,
  ): Promise<PostRevisionSummaryDto[]> {
    return this.postRevisionService.findByPostId(postId);
  }

  @Get(':postId/revisions/:revisionId')
  @RequirePermission(PERMISSIONS.POST.READ_ALL)
  @ApiBearerAuth('ACCESS-TOKEN')
  @ApiOperation({ summary: '게시글 판 전문 (관리자 전용)' })
  @ApiStandardResponses({ type: PostRevisionDto })
  async findRevision(
    @Param('postId') postId: string,
    @Param('revisionId') revisionId: string,
  ): Promise<PostRevisionDto> {
    return this.postRevisionService.findOne(postId, revisionId);
  }
}
