import { DEFAULT_LIMIT } from '../common/constants';
import { encodeCursor, decodeCursor, CursorPayload } from '../cursor/cursor.utils';
import { buildKeysetWhere } from './keyset.builder';
import { getKeysetPreset, KeysetPreset } from './keyset.presets';
import { KeysetResponseDto } from './dto/keyset-response.dto';

interface KeysetPaginationOptions<T> {
  prisma: {
    findMany: (args: any) => Promise<T[]>;
  };
  preset?: string | KeysetPreset;
  cursor?: string;
  limit?: number;
  where?: any;
  include?: any;
  select?: any;
}

export class KeysetPaginationService {
  /**
   * 직접 WHERE 조건을 생성하는 keyset 페이지네이션.
   * - preset 또는 커스텀 KeysetPreset 수용
   * - cursor payload에 모든 정렬 필드 값 인코딩 (DB 재조회 불필요)
   * - take: limit+1 전략으로 hasNextPage 판단
   */
  static async paginate<T>(
    options: KeysetPaginationOptions<T>,
  ): Promise<KeysetResponseDto<T>> {
    const {
      prisma,
      preset: presetInput = 'created-at',
      cursor,
      limit = DEFAULT_LIMIT,
      where = {},
      include,
      select,
    } = options;

    const preset =
      typeof presetInput === 'string'
        ? getKeysetPreset(presetInput)
        : presetInput;

    const orderBy = preset.fields.map((f) => ({ [f.field]: f.direction }));

    let finalWhere = { ...where };
    if (cursor) {
      const cursorValues = decodeCursor(cursor);
      const keysetCondition = buildKeysetWhere(preset.fields, cursorValues);
      finalWhere = { AND: [finalWhere, keysetCondition] };
    }

    const findManyArgs: any = {
      take: limit + 1,
      where: finalWhere,
      orderBy,
    };

    if (include) findManyArgs.include = include;
    if (select) findManyArgs.select = select;

    const items = await prisma.findMany(findManyArgs);

    const hasNextPage = items.length > limit;
    const data = hasNextPage ? items.slice(0, limit) : items;

    let nextCursor: string | null = null;
    if (hasNextPage && data.length > 0) {
      const lastItem = data[data.length - 1] as any;
      const payload: CursorPayload = {};
      for (const f of preset.fields) {
        payload[f.field] = lastItem[f.field];
      }
      nextCursor = encodeCursor(payload);
    }

    return { data, nextCursor, hasNextPage, limit };
  }
}
