import { NotFoundException } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { PrismaService } from '@weaver2/prisma';

jest.mock('../repositories/update-report.command', () => ({
  ResolveRelatedReportsCommand: jest.fn(),
}));

jest.mock('../../board/repositories/delete-post.command', () => ({
  DeletePostCommand: jest.fn(),
}));

import { ResolveRelatedReportsCommand } from '../repositories/update-report.command';
import { DeletePostCommand } from '../../board/repositories/delete-post.command';

describe('ModerationService', () => {
  let service: ModerationService;
  let prisma: any;
  const mockResolve = ResolveRelatedReportsCommand as jest.Mock;
  const mockDeletePost = DeletePostCommand as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      post: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      comment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      postFile: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    // $transaction(callback) → callback(prisma) 형태 모방
    prisma.$transaction = jest.fn((cb: (tx: any) => Promise<unknown>) =>
      cb(prisma),
    );

    service = new ModerationService(prisma as PrismaService);
  });

  describe('hidePost', () => {
    it('대상 없으면 NotFoundException', async () => {
      prisma.post.findUnique.mockResolvedValue(null);

      await expect(service.hidePost('p1', 'mod-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.post.update).not.toHaveBeenCalled();
      expect(mockResolve).not.toHaveBeenCalled();
    });

    it('성공 시 hiddenAt 설정 + 관련 신고 RESOLVED 처리 (한 트랜잭션)', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.post.update.mockResolvedValue({ id: 'p1' });

      const result = await service.hidePost('p1', 'mod-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { hiddenAt: expect.any(Date) },
      });
      expect(mockResolve).toHaveBeenCalledWith(
        prisma,
        'POST',
        'p1',
        'mod-1',
        'CONTENT_HIDDEN',
      );
      expect(result).toEqual({ id: 'p1', hiddenAt: expect.any(Date) });
    });
  });

  describe('deletePost / cascade 회귀 방지', () => {
    it('DeletePostCommand로 위임하여 자식까지 같은 tx에서 cascade', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1' });

      await service.deletePost('p1', 'mod-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // tx 인자가 DeletePostCommand에도, ResolveRelatedReportsCommand에도 같은 prisma여야 한다
      expect(mockDeletePost).toHaveBeenCalledWith(prisma, 'p1');
      expect(mockResolve).toHaveBeenCalledWith(
        prisma,
        'POST',
        'p1',
        'mod-1',
        'CONTENT_DELETED',
      );
    });

    it('대상 없으면 NotFoundException, command 호출 X', async () => {
      prisma.post.findUnique.mockResolvedValue(null);

      await expect(service.deletePost('p1', 'mod-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(mockDeletePost).not.toHaveBeenCalled();
      expect(mockResolve).not.toHaveBeenCalled();
    });
  });

  describe('suspendUser', () => {
    it('days 지정 시 미래 시각으로 정지', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue({ id: 'u1', suspendedUntil: null });

      const before = Date.now();
      await service.suspendUser('u1', 'mod-1', { days: 7 });
      const updateCall = prisma.user.update.mock.calls[0][0];
      const until = updateCall.data.suspendedUntil as Date;

      expect(until.getTime()).toBeGreaterThanOrEqual(
        before + 7 * 86400_000 - 1000,
      );
    });

    it('days 미지정 시 영구 정지(null)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        suspendedUntil: null,
      });

      await service.suspendUser('u1', 'mod-1', {});
      expect(prisma.user.update.mock.calls[0][0].data.suspendedUntil).toBeNull();
    });
  });

  describe('unsuspendUser', () => {
    it('suspendedUntil을 epoch 0으로 설정해 즉시 해제', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      await service.unsuspendUser('u1');

      const data = prisma.user.update.mock.calls[0][0].data;
      expect((data.suspendedUntil as Date).getTime()).toBe(0);
    });
  });
});
