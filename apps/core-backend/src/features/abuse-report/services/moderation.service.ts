import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { ResolveRelatedAbuseReportsCommand } from '../repositories/update-abuse-report.command';
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

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

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
      await ResolveRelatedAbuseReportsCommand(
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
      await ResolveRelatedAbuseReportsCommand(
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
      await ResolveRelatedAbuseReportsCommand(
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
      await ResolveRelatedAbuseReportsCommand(
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
      const file = await tx.postFile.findUnique({ where: { id } });
      if (!file) throw new NotFoundException(`Media '${id}' not found.`);

      const hiddenAt = new Date();
      await HidePostFileCommand(tx, id, hiddenAt);
      await ResolveRelatedAbuseReportsCommand(
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
    const file = await this.prisma.postFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException(`Media '${id}' not found.`);
    await UnhidePostFileCommand(this.prisma, id);
  }

  // ── User ──────────────────────────────────────────────

  async warnUser(
    userId: string,
    moderatorId: string,
  ): Promise<{ id: string; warningCount: number }> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId, deletedAt: null },
      });
      if (!user) throw new NotFoundException(`User '${userId}' not found.`);

      const updated = await WarnUserCommand(tx, userId);
      await ResolveRelatedAbuseReportsCommand(
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
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId, deletedAt: null },
      });
      if (!user) throw new NotFoundException(`User '${userId}' not found.`);

      const suspendedUntil = dto.days
        ? new Date(Date.now() + dto.days * 86400_000)
        : null; // null = 영구 정지

      const updated = await SuspendUserCommand(tx, userId, suspendedUntil);
      await ResolveRelatedAbuseReportsCommand(
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
