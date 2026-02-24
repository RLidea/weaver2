import { DEFAULT_LIMIT } from '../common/constants';
import { encodeCursor, decodeCursor, CursorPayload } from './cursor.utils';
import { CursorResponseDto } from './dto/cursor-response.dto';

export interface CursorField {
  field: string;
  direction: 'asc' | 'desc';
}

interface CursorPaginationOptions<T> {
  prisma: {
    findMany: (args: any) => Promise<T[]>;
  };
  cursorFields: CursorField[];
  cursor?: string;
  limit?: number;
  where?: Record<string, unknown>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
}

export class CursorPaginationService {
  /**
   * Prisma native cursor API를 활용한 cursor 페이지네이션.
   * - cursor는 마지막 아이템의 id를 기준으로 생성
   * - take: limit+1 전략으로 hasNextPage 판단
   * - cursorFields: 정렬 기준 필드 (id는 tiebreaker로 자동 추가)
   */
  static async paginate<T extends { id: string }>(
    options: CursorPaginationOptions<T>,
  ): Promise<CursorResponseDto<T>> {
    const {
      prisma,
      cursorFields,
      cursor,
      limit = DEFAULT_LIMIT,
      where,
      include,
      select,
    } = options;

    const orderBy = [
      ...cursorFields.map((cf) => ({ [cf.field]: cf.direction })),
      { id: 'asc' as const },
    ];

    const findManyArgs: Record<string, unknown> = {
      take: limit + 1,
      where,
      orderBy,
    };

    if (include) findManyArgs.include = include;
    if (select) findManyArgs.select = select;

    if (cursor) {
      const decoded = decodeCursor<{ id: string }>(cursor);
      findManyArgs.cursor = { id: decoded.id };
      findManyArgs.skip = 1;
    }

    const items = await prisma.findMany(findManyArgs);

    const hasNextPage = items.length > limit;
    const data = hasNextPage ? items.slice(0, limit) : items;

    let nextCursor: string | null = null;
    if (hasNextPage && data.length > 0) {
      const lastItem = data[data.length - 1];
      const payload: CursorPayload = { id: lastItem.id };
      for (const cf of cursorFields) {
        payload[cf.field] = (lastItem as Record<string, unknown>)[cf.field] as
          | string
          | number
          | Date;
      }
      nextCursor = encodeCursor(payload);
    }

    return { data, nextCursor, hasNextPage, limit };
  }
}
