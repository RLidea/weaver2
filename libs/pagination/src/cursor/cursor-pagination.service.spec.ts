import { CursorPaginationService } from './cursor-pagination.service';
import { decodeCursor } from './cursor.utils';

const makeItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `id-${i}`,
    createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
  }));

describe('CursorPaginationService', () => {
  const cursorFields = [{ field: 'createdAt', direction: 'desc' as const }];

  it('첫 페이지 - cursor 없이 호출 시 nextCursor 반환', async () => {
    const items = makeItems(11); // limit+1
    const prismaMock = { findMany: jest.fn().mockResolvedValue(items) };

    const result = await CursorPaginationService.paginate({
      prisma: prismaMock,
      cursorFields,
      limit: 10,
    });

    expect(result.data).toHaveLength(10);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).not.toBeNull();

    // cursor에 id와 createdAt이 포함되어야 함
    const decoded = decodeCursor(result.nextCursor!);
    expect(decoded.id).toBe('id-9');
    expect(decoded.createdAt).toBeDefined();
  });

  it('마지막 페이지 - hasNextPage=false, nextCursor=null', async () => {
    const items = makeItems(5); // limit보다 적음
    const prismaMock = { findMany: jest.fn().mockResolvedValue(items) };

    const result = await CursorPaginationService.paginate({
      prisma: prismaMock,
      cursorFields,
      limit: 10,
    });

    expect(result.data).toHaveLength(5);
    expect(result.hasNextPage).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('빈 결과', async () => {
    const prismaMock = { findMany: jest.fn().mockResolvedValue([]) };

    const result = await CursorPaginationService.paginate({
      prisma: prismaMock,
      cursorFields,
      limit: 10,
    });

    expect(result.data).toHaveLength(0);
    expect(result.hasNextPage).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('cursor 있을 때 Prisma cursor + skip:1 전달', async () => {
    const prismaMock = { findMany: jest.fn().mockResolvedValue([]) };
    const prevResult = await CursorPaginationService.paginate({
      prisma: { findMany: jest.fn().mockResolvedValue(makeItems(11)) },
      cursorFields,
      limit: 10,
    });

    await CursorPaginationService.paginate({
      prisma: prismaMock,
      cursorFields,
      cursor: prevResult.nextCursor!,
      limit: 10,
    });

    const args = prismaMock.findMany.mock.calls[0][0] as {
      cursor: Record<string, unknown>;
      skip: number;
    };
    expect(args.cursor).toEqual({ id: 'id-9' });
    expect(args.skip).toBe(1);
  });
});
