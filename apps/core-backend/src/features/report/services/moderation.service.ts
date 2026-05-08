import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { ResolveRelatedReportsCommand } from '../repositories/update-report.command';
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
      await tx.post.update({ where: { id }, data: { hiddenAt } });
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
    await this.prisma.post.update({ where: { id }, data: { hiddenAt: null } });
  }

  async deletePost(id: string, moderatorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id, deletedAt: null },
      });
      if (!post) throw new NotFoundException(`Post '${id}' not found.`);

      await tx.post.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
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
      await tx.comment.update({ where: { id }, data: { hiddenAt } });
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
    await this.prisma.comment.update({
      where: { id },
      data: { hiddenAt: null },
    });
  }

  async deleteComment(id: string, moderatorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findUnique({
        where: { id, deletedAt: null },
      });
      if (!comment) throw new NotFoundException(`Comment '${id}' not found.`);

      await tx.comment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
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
      const file = await tx.postFile.findUnique({ where: { id } });
      if (!file) throw new NotFoundException(`Media '${id}' not found.`);

      const hiddenAt = new Date();
      await tx.postFile.update({ where: { id }, data: { hiddenAt } });
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
    const file = await this.prisma.postFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException(`Media '${id}' not found.`);
    await this.prisma.postFile.update({
      where: { id },
      data: { hiddenAt: null },
    });
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

      const updated = await tx.user.update({
        where: { id: userId },
        data: { warningCount: { increment: 1 } },
        select: { id: true, warningCount: true },
      });
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
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId, deletedAt: null },
      });
      if (!user) throw new NotFoundException(`User '${userId}' not found.`);

      const suspendedUntil = dto.days
        ? new Date(Date.now() + dto.days * 86400_000)
        : null; // null = 영구 정지

      const updated = await tx.user.update({
        where: { id: userId },
        data: { suspendedUntil },
        select: { id: true, suspendedUntil: true },
      });
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
    await this.prisma.user.update({
      where: { id: userId },
      data: { suspendedUntil: new Date(0) }, // 과거 시각으로 설정 → 정지 해제
    });
  }
}
