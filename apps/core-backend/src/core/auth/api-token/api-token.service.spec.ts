import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { createHash } from 'crypto';
import { ApiTokenService } from './api-token.service';
import { generateApiToken } from './api-token.crypto';

const NOW = new Date('2026-10-19T00:00:00.000Z');
const LATER = new Date('2026-11-19T00:00:00.000Z');
const EARLIER = new Date('2026-09-19T00:00:00.000Z');

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe('ApiTokenService', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    apiToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const service = new ApiTokenService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => jest.useRealTimers());

  describe('issue', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue({ id: 'owner' });
      prisma.apiToken.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => ({
          id: 't1',
          ...data,
        }),
      );
    });

    it('원문은 응답에만 있고, 저장소에는 sha256 해시만 넘긴다', async () => {
      const result = await service.issue({
        userId: 'owner',
        name: '초안 봇',
        scopes: ['blog:draft'],
      });

      expect(result.token).toMatch(/^wvt_[0-9a-f]{12}_[0-9a-f]{64}$/);
      const [[{ data }]] = prisma.apiToken.create.mock.calls as [
        [{ data: Record<string, unknown> }],
      ];
      expect(data).toEqual({
        userId: 'owner',
        name: '초안 봇',
        prefix: result.token.slice(0, 16),
        tokenHash: sha256(result.token),
        scopes: ['blog:draft'],
        expiresAt: null,
      });
      expect(JSON.stringify(data)).not.toContain(result.token);
    });

    it('만료 시각을 그대로 저장한다', async () => {
      await service.issue({
        userId: 'owner',
        name: 'n',
        scopes: ['a'],
        expiresAt: LATER,
      });
      expect(prisma.apiToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ expiresAt: LATER }) as unknown,
        }),
      );
    });

    it('주인이 없거나 탈퇴했으면 404', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.issue({ userId: 'gone', name: 'n', scopes: ['a'] }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.apiToken.create).not.toHaveBeenCalled();
    });

    it('지난 만료 시각이면 400', async () => {
      await expect(
        service.issue({
          userId: 'owner',
          name: 'n',
          scopes: ['a'],
          expiresAt: EARLIER,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('verify', () => {
    const issued = generateApiToken();
    const row = (overrides: Record<string, unknown> = {}) => ({
      id: 't1',
      tokenHash: issued.tokenHash,
      scopes: ['blog:draft'],
      expiresAt: null,
      revokedAt: null,
      user: {
        id: 'owner',
        username: 'bot',
        deletedAt: null,
        suspendedUntil: null,
      },
      ...overrides,
    });

    it('맞는 토큰이면 토큰 id · 범위 · 주인을 준다', async () => {
      prisma.apiToken.findUnique.mockResolvedValue(row());
      await expect(service.verify(issued)).resolves.toEqual({
        id: 't1',
        scopes: ['blog:draft'],
        user: { id: 'owner', username: 'bot' },
      });
      expect(prisma.apiToken.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { prefix: issued.prefix } }),
      );
    });

    it.each([
      ['prefix 에 맞는 행이 없다', null],
      ['해시가 다르다', row({ tokenHash: sha256('other') })],
      ['끊겼다', row({ revokedAt: EARLIER })],
      ['만료됐다', row({ expiresAt: EARLIER })],
      ['만료 시각이 바로 지금이다', row({ expiresAt: NOW })],
      ['주인이 탈퇴했다', row({ user: { ...row().user, deletedAt: EARLIER } })],
      [
        '주인이 정지됐다',
        row({ user: { ...row().user, suspendedUntil: LATER } }),
      ],
    ])('%s → null', async (_, found) => {
      prisma.apiToken.findUnique.mockResolvedValue(found);
      await expect(service.verify(issued)).resolves.toBeNull();
    });

    it('만료 전 · 정지가 풀린 주인이면 통과', async () => {
      prisma.apiToken.findUnique.mockResolvedValue(
        row({
          expiresAt: LATER,
          user: { ...row().user, suspendedUntil: EARLIER },
        }),
      );
      await expect(service.verify(issued)).resolves.not.toBeNull();
    });

    it('verify 는 lastUsedAt 을 쓰지 않는다 — 범위 판정 뒤 markUsed 가 쓴다', async () => {
      prisma.apiToken.findUnique.mockResolvedValue(row());
      await service.verify(issued);
      expect(prisma.apiToken.update).not.toHaveBeenCalled();
    });
  });

  it('markUsed 는 lastUsedAt 을 지금으로', async () => {
    await service.markUsed('t1');
    expect(prisma.apiToken.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { lastUsedAt: NOW },
    });
  });

  describe('revoke', () => {
    it('살아 있을 때만 revokedAt 을 박고, 행을 돌려준다', async () => {
      prisma.apiToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.apiToken.findUnique.mockResolvedValue({
        id: 't1',
        revokedAt: NOW,
      });
      await expect(service.revoke('t1')).resolves.toEqual({
        id: 't1',
        revokedAt: NOW,
      });
      expect(prisma.apiToken.updateMany).toHaveBeenCalledWith({
        where: { id: 't1', revokedAt: null },
        data: { revokedAt: NOW },
      });
    });

    it('이미 끊긴 토큰은 처음 시각 그대로 돌려준다', async () => {
      prisma.apiToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.apiToken.findUnique.mockResolvedValue({
        id: 't1',
        revokedAt: EARLIER,
      });
      await expect(service.revoke('t1')).resolves.toEqual({
        id: 't1',
        revokedAt: EARLIER,
      });
    });

    it('없는 id 면 404', async () => {
      prisma.apiToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.apiToken.findUnique.mockResolvedValue(null);
      await expect(service.revoke('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
