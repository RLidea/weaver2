import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { Role, PostStatus } from '@prisma/client';
import { AdminContentApiService } from '../services/admin-content.api.service';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';
import { BoardPermissionDto } from '../dto/board-permission.dto';

@ApiTags('Admin Content')
@Controller({ path: 'admin/content', version: '1' })
@Roles(Role.ADMIN, Role.DEVELOPER)
export class AdminContentApiController {
  constructor(
    private readonly adminContentApiService: AdminContentApiService,
  ) {}

  // ============ Board Management ============
  @Get('boards')
  @ApiOperation({ summary: 'Get all boards with statistics' })
  async getBoards() {
    return this.adminContentApiService.getBoardsWithStats();
  }

  @Get('boards/:boardId')
  @ApiOperation({ summary: 'Get board details with permissions' })
  async getBoardDetails(@Param('boardId') boardId: string) {
    return this.adminContentApiService.getBoardDetails(boardId);
  }

  @Get('boards/:boardId/permissions')
  @ApiOperation({ summary: 'Get board permissions' })
  async getBoardPermissions(@Param('boardId') boardId: string) {
    return this.adminContentApiService.getBoardPermissions(boardId);
  }

  @Patch('boards/:boardId/permissions')
  @ApiOperation({ summary: 'Update board permissions' })
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
  @ApiOperation({ summary: 'Delete board (Admin only)' })
  async deleteBoard(@Param('boardId') boardId: string) {
    return this.adminContentApiService.deleteBoard(boardId);
  }

  // ============ Post Management ============
  @Get('posts')
  @ApiOperation({ summary: 'Get posts with filtering and pagination' })
  async getPosts(
    @Query() paginationDto: PaginationRequestDto,
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
  @ApiOperation({ summary: 'Get post details' })
  async getPostDetails(@Param('postId') postId: string) {
    return this.adminContentApiService.getPostDetails(postId);
  }

  @Patch('posts/:postId/status')
  @ApiOperation({ summary: 'Update post status (hide/show)' })
  async updatePostStatus(
    @Param('postId') postId: string,
    @Body('status') status: PostStatus,
  ) {
    return this.adminContentApiService.updatePostStatus(postId, status);
  }

  @Delete('posts/:postId')
  @ApiOperation({ summary: 'Delete post (Admin only)' })
  async deletePost(@Param('postId') postId: string) {
    return this.adminContentApiService.deletePost(postId);
  }

  // ============ Comment Management ============
  @Get('comments')
  @ApiOperation({ summary: 'Get comments with filtering and pagination' })
  async getComments(
    @Query() paginationDto: PaginationRequestDto,
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
  @ApiOperation({ summary: 'Delete comment (Admin only)' })
  async deleteComment(@Param('commentId') commentId: string) {
    return this.adminContentApiService.deleteComment(commentId);
  }

  // ============ Statistics ============
  @Get('stats')
  @ApiOperation({ summary: 'Get content statistics' })
  async getContentStats() {
    return this.adminContentApiService.getContentStats();
  }

  @Get('stats/boards/:boardId')
  @ApiOperation({ summary: 'Get specific board statistics' })
  async getBoardStats(@Param('boardId') boardId: string) {
    return this.adminContentApiService.getBoardStats(boardId);
  }
}
