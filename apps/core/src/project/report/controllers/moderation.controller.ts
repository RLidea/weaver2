import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../features/auth/guards/jwt-auth.guard';
import { RequirePermission } from '../../../features/permission/decorators/require-permission.decorator';
import { PermissionGuard } from '../../../features/permission/guards/permission.guard';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { ModerationService } from '../services/moderation.service';
import {
  HideContentDto,
  SuspendUserDto,
  WarnUserDto,
} from '../dto/moderation-action.dto';

@ApiTags('Moderation')
@Controller({ path: 'admin/moderation', version: '1' })
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  // ── Post ──────────────────────────────────────────────

  @Patch('posts/:id/hide')
  @RequirePermission(PERMISSIONS.MODERATION.CONTENT_HIDE)
  @ApiOperation({ summary: '게시글 숨김' })
  @ApiStandardResponses({ type: Object })
  async hidePost(
    @Param('id') id: string,
    @Body() _dto: HideContentDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    return this.moderationService.hidePost(id, authUser.id);
  }

  @Patch('posts/:id/unhide')
  @RequirePermission(PERMISSIONS.MODERATION.CONTENT_HIDE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '게시글 숨김 해제' })
  @ApiStandardResponses({ status: 204, description: 'Post unhidden' })
  async unhidePost(@Param('id') id: string): Promise<void> {
    await this.moderationService.unhidePost(id);
  }

  @Delete('posts/:id')
  @RequirePermission(PERMISSIONS.MODERATION.CONTENT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '게시글 삭제 (모더레이터)' })
  @ApiStandardResponses({ status: 204, description: 'Post deleted' })
  async deletePost(
    @Param('id') id: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<void> {
    await this.moderationService.deletePost(id, authUser.id);
  }

  // ── Comment ───────────────────────────────────────────

  @Patch('comments/:id/hide')
  @RequirePermission(PERMISSIONS.MODERATION.CONTENT_HIDE)
  @ApiOperation({ summary: '댓글 숨김' })
  @ApiStandardResponses({ type: Object })
  async hideComment(
    @Param('id') id: string,
    @Body() _dto: HideContentDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    return this.moderationService.hideComment(id, authUser.id);
  }

  @Patch('comments/:id/unhide')
  @RequirePermission(PERMISSIONS.MODERATION.CONTENT_HIDE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '댓글 숨김 해제' })
  @ApiStandardResponses({ status: 204, description: 'Comment unhidden' })
  async unhideComment(@Param('id') id: string): Promise<void> {
    await this.moderationService.unhideComment(id);
  }

  @Delete('comments/:id')
  @RequirePermission(PERMISSIONS.MODERATION.CONTENT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '댓글 삭제 (모더레이터)' })
  @ApiStandardResponses({ status: 204, description: 'Comment deleted' })
  async deleteComment(
    @Param('id') id: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<void> {
    await this.moderationService.deleteComment(id, authUser.id);
  }

  // ── Media ─────────────────────────────────────────────

  @Patch('media/:id/hide')
  @RequirePermission(PERMISSIONS.MODERATION.CONTENT_HIDE)
  @ApiOperation({ summary: '미디어 숨김' })
  @ApiStandardResponses({ type: Object })
  async hideMedia(
    @Param('id') id: string,
    @Body() _dto: HideContentDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    return this.moderationService.hideMedia(id, authUser.id);
  }

  @Patch('media/:id/unhide')
  @RequirePermission(PERMISSIONS.MODERATION.CONTENT_HIDE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '미디어 숨김 해제' })
  @ApiStandardResponses({ status: 204, description: 'Media unhidden' })
  async unhideMedia(@Param('id') id: string): Promise<void> {
    await this.moderationService.unhideMedia(id);
  }

  // ── User ──────────────────────────────────────────────

  @Post('users/:id/warn')
  @RequirePermission(PERMISSIONS.MODERATION.USER_WARN)
  @ApiOperation({ summary: '유저 경고' })
  @ApiStandardResponses({ type: Object })
  async warnUser(
    @Param('id') id: string,
    @Body() _dto: WarnUserDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    return this.moderationService.warnUser(id, authUser.id);
  }

  @Post('users/:id/suspend')
  @RequirePermission(PERMISSIONS.USER.SUSPEND)
  @ApiOperation({ summary: '유저 정지' })
  @ApiStandardResponses({ type: Object })
  async suspendUser(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    return this.moderationService.suspendUser(id, authUser.id, dto);
  }

  @Post('users/:id/unsuspend')
  @RequirePermission(PERMISSIONS.USER.SUSPEND)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '유저 정지 해제' })
  @ApiStandardResponses({ status: 204, description: 'User unsuspended' })
  async unsuspendUser(@Param('id') id: string): Promise<void> {
    await this.moderationService.unsuspendUser(id);
  }
}
