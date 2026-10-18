import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { ResolveRelatedReportsCommand } from '../repositories/update-report.command';
import { DeletePostCommand } from '../../board/repositories/delete-post.command';
import {
  HidePostCommand,
  UnhidePostCommand,
} from '../../board/repositories/hide-post.command';
import {
  HideCommentCommand,
  UnhideCommentCommand,
  SoftDeleteCommentCommand,
} from '../../board/repositories/hide-comment.command';
import {
  HidePostFileCommand,
  UnhidePostFileCommand,
} from '../../board/repositories/hide-post-file.command';
import { WarnUserCommand } from '../../../core/user/repositories/warn-user.command';
import { SuspendUserCommand } from '../../../core/user/repositories/suspend-user.command';
import { UnsuspendUserCommand } from '../../../core/user/repositories/unsuspend-user.command';
import { SuspendUserDto } from '../dto/moderation-action.dto';
import { PermissionService } from '../../../core/permission/services/permission.service';

/** 영구 정지 — null 은 「정지 안 됨」이라 쓰지 않는다 */
const PERMANENT_SUSPENSION = new Date('9999-12-31T23:59:59.999Z');

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
  ) {}

  // ── Post ──────────────────────────────────────────────

  async hidePost(
    id: string,
    moderatorId: string,
  ): Promise<{ id: string; hiddenAt: Date }> {
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id, deletedAt: null },
      });
      if (!post) throw new NotFoundException(`Post '${id}' not found.`);

      const hiddenAt = new Date();
      await HidePostCommand(tx, id, hiddenAt);
      await ResolveRelatedReportsCommand(
        tx,
        'POST',
        id,
        moderatorId,
        'CONTENT_HIDDEN',
      );
      return { id, hiddenAt };
    });
  }

  async unhidePost(id: string): Promise<void> {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException(`Post '${id}' not found.`);
    await UnhidePostCommand(this.prisma, id);
  }

  async deletePost(id: string, moderatorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id, deletedAt: null },
      });
      if (!post) throw new NotFoundException(`Post '${id}' not found.`);

      await DeletePostCommand(tx, id);
      await ResolveRelatedReportsCommand(
        tx,
        'POST',
        id,
        moderatorId,
        'CONTENT_DELETED',
      );
    });
  }

  // ── Comment ───────────────────────────────────────────

  async hideComment(
    id: string,
    moderatorId: string,
  ): Promise<{ id: string; hiddenAt: Date }> {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findUnique({
        where: { id, deletedAt: null },
      });
      if (!comment) throw new NotFoundException(`Comment '${id}' not found.`);

      const hiddenAt = new Date();
      await HideCommentCommand(tx, id, hiddenAt);
      await ResolveRelatedReportsCommand(
        tx,
        'COMMENT',
        id,
        moderatorId,
        'CONTENT_HIDDEN',
      );
      return { id, hiddenAt };
    });
  }

  async unhideComment(id: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException(`Comment '${id}' not found.`);
    await UnhideCommentCommand(this.prisma, id);
  }

  async deleteComment(id: string, moderatorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findUnique({
        where: { id, deletedAt: null },
      });
      if (!comment) throw new NotFoundException(`Comment '${id}' not found.`);

      await SoftDeleteCommentCommand(tx, id, new Date());
      await ResolveRelatedReportsCommand(
        tx,
        'COMMENT',
        id,
        moderatorId,
        'CONTENT_DELETED',
      );
    });
  }

  // ── Media ─────────────────────────────────────────────

  async hideMedia(
    id: string,
    moderatorId: string,
  ): Promise<{ id: string; hiddenAt: Date }> {
    return this.prisma.$transaction(async (tx) => {
      const file = await tx.file.findUnique({ where: { id } });
      if (!file) throw new NotFoundException(`Media '${id}' not found.`);

      const hiddenAt = new Date();
      await HidePostFileCommand(tx, id, hiddenAt);
      await ResolveRelatedReportsCommand(
        tx,
        'MEDIA',
        id,
        moderatorId,
        'CONTENT_HIDDEN',
      );
      return { id, hiddenAt };
    });
  }

  async unhideMedia(id: string): Promise<void> {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException(`Media '${id}' not found.`);
    await UnhidePostFileCommand(this.prisma, id);
  }

  // ── User ──────────────────────────────────────────────

  async warnUser(
    userId: string,
    moderatorId: string,
  ): Promise<{ id: string; warningCount: number }> {
    // 자기보다 권한이 넓은 사람(예: Moderator → Admin)은 경고·정지하지 못한다
    await this.permissionService.assertCovers(moderatorId, userId);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId, deletedAt: null },
      });
      if (!user) throw new NotFoundException(`User '${userId}' not found.`);

      const updated = await WarnUserCommand(tx, userId);
      await ResolveRelatedReportsCommand(
        tx,
        'USER',
        userId,
        moderatorId,
        'USER_WARNED',
      );
      return updated;
    });
  }

  async suspendUser(
    userId: string,
    moderatorId: string,
    dto: SuspendUserDto,
  ): Promise<{ id: string; suspendedUntil: Date | null }> {
    if (moderatorId === userId) {
      throw new BadRequestException('자기 자신을 정지할 수 없습니다.');
    }
    await this.permissionService.assertCovers(moderatorId, userId);
    // 슈퍼관리자끼리 서로를 동시에 정지하면 0명이 될 수 있다 — 가드 안에서 한다
    return this.permissionService.withSuperAdminGuard(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId, deletedAt: null },
      });
      if (!user) throw new NotFoundException(`User '${userId}' not found.`);

      // 영구 정지는 먼 미래 시각으로 적는다. null 은 로그인·토큰 검사가 「정지 안 됨」으로 읽어,
      // 예전에는 모더레이터의 영구 정지가 아무 효과가 없었다(관리자 정지와 같은 값을 쓴다)
      const suspendedUntil = dto.days
        ? new Date(Date.now() + dto.days * 86400_000)
        : PERMANENT_SUSPENSION;

      const updated = await SuspendUserCommand(tx, userId, suspendedUntil);
      await ResolveRelatedReportsCommand(
        tx,
        'USER',
        userId,
        moderatorId,
        'USER_SUSPENDED',
      );
      return updated;
    });
  }

  async unsuspendUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User '${userId}' not found.`);
    await UnsuspendUserCommand(this.prisma, userId);
  }
}
