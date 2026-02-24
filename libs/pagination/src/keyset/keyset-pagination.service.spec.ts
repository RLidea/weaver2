import { KeysetPaginationService } from './keyset-pagination.service';
import { encodeCursor } from '../cursor/cursor.utils';

const makeItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `id-${i}`,
    createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
    viewCount: 100 - i,
  }));

describe('KeysetPaginationService', () => {
  it('첫 페이지 (cursor 없음) - created-at preset', async () => {
    const items = makeItems(11);
    const prismaMock = { findMany: jest.fn().mockResolvedValue(items) };

    const result = await KeysetPaginationService.paginate({
      prisma: prismaMock,
      preset: 'created-at',
      limit: 10,
    });

    expect(result.data).toHaveLength(10);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).not.toBeNull();

    // WHERE 조건에 keyset 없어야 함 (첫 페이지)
    const args = prismaMock.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(args.where).not.toHaveProperty('AND');
  });

  it('cursor 있을 때 WHERE에 AND 조건 추가', async () => {
    const prismaMock = { findMany: jest.fn().mockResolvedValue([]) };
    const cursor = encodeCursor({
      createdAt: '2024-01-10T00:00:00.000Z',
      id: 'id-9',
    });

    await KeysetPaginationService.paginate({
      prisma: prismaMock,
      preset: 'created-at',
      cursor,
      limit: 10,
    });

    const args = prismaMock.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(args.where).toHaveProperty('AND');
  });

  it('view-count preset 사용', async () => {
    const items = makeItems(5);
    const prismaMock = { findMany: jest.fn().mockResolvedValue(items) };

    const result = await KeysetPaginationService.paginate({
      prisma: prismaMock,
      preset: 'view-count',
      limit: 10,
    });

    // orderBy에 viewCount 포함
    const args = prismaMock.findMany.mock.calls[0][0] as {
      orderBy: Array<Record<string, string>>;
    };
    expect(args.orderBy[0]).toEqual({ viewCount: 'desc' });
    expect(result.hasNextPage).toBe(false);
  });

  it('커스텀 preset 객체 수용', async () => {
    const prismaMock = { findMany: jest.fn().mockResolvedValue([]) };

    await KeysetPaginationService.paginate({
      prisma: prismaMock,
      preset: {
        name: 'custom',
        fields: [{ field: 'priority', direction: 'desc', type: 'number' }],
      },
      limit: 10,
    });

    const args = prismaMock.findMany.mock.calls[0][0] as {
      orderBy: Array<Record<string, string>>;
    };
    expect(args.orderBy[0]).toEqual({ priority: 'desc' });
  });

  it('알 수 없는 preset은 에러 발생', async () => {
    const prismaMock = { findMany: jest.fn() };

    await expect(
      KeysetPaginationService.paginate({
        prisma: prismaMock,
        preset: 'unknown-preset',
        limit: 10,
      }),
    ).rejects.toThrow('Unknown keyset preset');
  });

  it('마지막 페이지 - nextCursor=null', async () => {
    const prismaMock = { findMany: jest.fn().mockResolvedValue(makeItems(3)) };

    const result = await KeysetPaginationService.paginate({
      prisma: prismaMock,
      preset: 'created-at',
      limit: 10,
    });

    expect(result.hasNextPage).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});
