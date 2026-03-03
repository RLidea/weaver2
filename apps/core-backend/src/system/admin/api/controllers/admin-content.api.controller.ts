import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { PostStatus } from '@prisma/client';
import { AdminContentApiService } from '../services/admin-content.api.service';
import { OffsetRequestDto } from '@weaver2/pagination';
import { BoardPermissionDto } from '../dto/board-permission.dto';

@ApiTags('Admin Content')
@Controller({ path: 'admin/content', version: '1' })
export class AdminContentApiController {
  constructor(
    private readonly adminContentApiService: AdminContentApiService,
  ) {}

  // ============ Board Management ============
  @Get('boards')
  @ApiOperation({ summary: '게시판 목록 조회 (통계 포함)' })
  @RequirePermission(PERMISSIONS.BOARD.READ)
  async getBoards() {
    return this.adminContentApiService.getBoardsWithStats();
  }

  @Get('boards/:boardId')
  @ApiOperation({ summary: '게시판 상세 조회 (권한 포함)' })
  @RequirePermission(PERMISSIONS.BOARD.READ)
  async getBoardDetails(@Param('boardId') boardId: string) {
    return this.adminContentApiService.getBoardDetails(boardId);
  }

  @Get('boards/:boardId/permissions')
  @ApiOperation({ summary: '게시판 권한 조회' })
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  async getBoardPermissions(@Param('boardId') boardId: string) {
    return this.adminContentApiService.getBoardPermissions(boardId);
  }

  @Patch('boards/:boardId/permissions')
  @ApiOperation({ summary: '게시판 권한 수정' })
  @RequirePermission(PERMISSIONS.BOARD.MANAGE)
  async updateBoardPermissions(
    @Param('boardId') boardId: string,
    @Body() permissions: BoardPermissionDto[],
  ) {
    return this.adminContentApiService.updateBoardPermissions(
      boardId,
      permissions,
    );
  }

  @Delete('boards/:boardId')
  @ApiOperation({ summary: '게시판 삭제 (관리자 전용)' })
  @RequirePermission(PERMISSIONS.BOARD.DELETE)
  async deleteBoard(@Param('boardId') boardId: string) {
    return this.adminContentApiService.deleteBoard(boardId);
  }

  // ============ Post Management ============
  @Get('posts')
  @ApiOperation({ summary: '게시글 조회 (필터링, 페이지네이션)' })
  @RequirePermission(PERMISSIONS.POST.READ_ALL)
  async getPosts(
    @Query() paginationDto: OffsetRequestDto,
    @Query('boardId') boardId?: string,
    @Query('status') status?: PostStatus,
    @Query('search') search?: string,
  ) {
    return this.adminContentApiService.getPosts({
      pagination: paginationDto,
      boardId,
      status,
      search,
    });
  }

  @Get('posts/:postId')
  @ApiOperation({ summary: '게시글 상세 조회' })
  @RequirePermission(PERMISSIONS.POST.READ_ALL)
  async getPostDetails(@Param('postId') postId: string) {
    return this.adminContentApiService.getPostDetails(postId);
  }

  @Patch('posts/:postId/status')
  @ApiOperation({ summary: '게시글 상태 변경 (숨김/표시)' })
  @RequirePermission(PERMISSIONS.POST.UPDATE_ALL)
  async updatePostStatus(
    @Param('postId') postId: string,
    @Body('status') status: PostStatus,
  ) {
    return this.adminContentApiService.updatePostStatus(postId, status);
  }

  @Delete('posts/:postId')
  @ApiOperation({ summary: '게시글 삭제 (관리자 전용)' })
  @RequirePermission(PERMISSIONS.POST.DELETE_ALL)
  async deletePost(@Param('postId') postId: string) {
    return this.adminContentApiService.deletePost(postId);
  }

  // ============ Comment Management ============
  @Get('comments')
  @ApiOperation({ summary: '댓글 조회 (필터링, 페이지네이션)' })
  @RequirePermission(PERMISSIONS.COMMENT.READ)
  async getComments(
    @Query() paginationDto: OffsetRequestDto,
    @Query('postId') postId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminContentApiService.getComments({
      pagination: paginationDto,
      postId,
      search,
    });
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: '댓글 삭제 (관리자 전용)' })
  @RequirePermission(PERMISSIONS.COMMENT.DELETE_ALL)
  async deleteComment(@Param('commentId') commentId: string) {
    return this.adminContentApiService.deleteComment(commentId);
  }

  // ============ Content Purge ============
  @Post('purge')
  @ApiOperation({
    summary: '소프트 삭제된 콘텐츠 영구 삭제',
    description:
      'olderThanDays 미지정 시 소프트 삭제된 모든 콘텐츠를 영구 삭제합니다.',
  })
  @RequirePermission(PERMISSIONS.ADMIN.SYSTEM_SETTINGS)
  async purgeDeletedContent(@Body('olderThanDays') olderThanDays?: number) {
    return this.adminContentApiService.purgeDeletedContent(olderThanDays);
  }

  // ============ Statistics ============
  @Get('stats')
  @ApiOperation({ summary: '콘텐츠 통계 조회' })
  @RequirePermission(PERMISSIONS.ANALYTICS.READ)
  async getContentStats() {
    return this.adminContentApiService.getContentStats();
  }

  @Get('stats/boards/:boardId')
  @ApiOperation({ summary: '특정 게시판 통계 조회' })
  @RequirePermission(PERMISSIONS.ANALYTICS.READ)
  async getBoardStats(@Param('boardId') boardId: string) {
    return this.adminContentApiService.getBoardStats(boardId);
  }
}
