import { DEFAULT_LIMIT } from '../common/constants';
import {
  encodeCursor,
  decodeCursor,
  CursorPayload,
} from '../cursor/cursor.utils';
import { buildKeysetWhere } from './keyset.builder';
import { getKeysetPreset, KeysetPreset } from './keyset.presets';
import { KeysetResponseDto } from './dto/keyset-response.dto';

interface KeysetPaginationOptions<T> {
  prisma: {
    findMany: (args: any) => Promise<T[]>;
  };
  /** 요청에서 온 프리셋 이름 — KEYSET_PRESETS 에 있는 것만 통한다 */
  preset?: string;
  /**
   * 서버가 정의한 프리셋(예: 댓글 시간순). 요청 값을 여기에 넣지 않는다 — 필드 이름이 그대로
   * where·orderBy 의 키가 된다. 이름(`preset`)과 나눠, 요청 값이 객체로 들어올 길을 없앤다
   */
  presetDef?: KeysetPreset;
  cursor?: string;
  limit?: number;
  where?: Record<string, unknown>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
}

export class KeysetPaginationService {
  /**
   * 직접 WHERE 조건을 생성하는 keyset 페이지네이션.
   * - 프리셋 이름(preset) 또는 서버 정의 프리셋(presetDef)
   * - cursor payload에 모든 정렬 필드 값 인코딩 (DB 재조회 불필요)
   * - take: limit+1 전략으로 hasNextPage 판단
   */
  static async paginate<T>(
    options: KeysetPaginationOptions<T>,
  ): Promise<KeysetResponseDto<T>> {
    const {
      prisma,
      preset: presetName = 'created-at',
      presetDef,
      cursor,
      limit = DEFAULT_LIMIT,
      where = {},
      include,
      select,
    } = options;

    const preset = presetDef ?? getKeysetPreset(presetName);

    const orderBy = preset.fields.map((f) => ({ [f.field]: f.direction }));

    let finalWhere: Record<string, unknown> = { ...where };
    if (cursor) {
      const cursorValues = decodeCursor(cursor);
      const keysetCondition = buildKeysetWhere(preset.fields, cursorValues);
      finalWhere = { AND: [finalWhere, keysetCondition] };
    }

    const findManyArgs: Record<string, unknown> = {
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
      const lastItem = data[data.length - 1] as Record<string, unknown>;
      const payload: CursorPayload = {};
      for (const f of preset.fields) {
        payload[f.field] = lastItem[f.field] as string | number | Date;
      }
      nextCursor = encodeCursor(payload);
    }

    return { data, nextCursor, hasNextPage, limit };
  }
}
