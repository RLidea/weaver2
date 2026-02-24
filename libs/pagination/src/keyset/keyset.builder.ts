import { CursorPayload } from '../cursor/cursor.utils';
import { KeysetFieldDef } from './keyset.presets';

/**
 * Keyset 페이지네이션용 Prisma WHERE 조건 생성.
 *
 * N개 필드 [A desc, B asc, C desc]에 대해:
 *   (A < curA)
 *   OR (A = curA AND B > curB)
 *   OR (A = curA AND B = curB AND C < curC)
 *
 * 방향: desc → lt (작은 값), asc → gt (큰 값)
 */
export function buildKeysetWhere(
  fields: KeysetFieldDef[],
  cursorValues: CursorPayload,
): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = [];

  for (let i = 0; i < fields.length; i++) {
    const condition: Record<string, unknown> = {};

    // 앞 필드들은 동등 조건
    for (let j = 0; j < i; j++) {
      const prev = fields[j];
      condition[prev.field] = castValue(cursorValues[prev.field], prev.type);
    }

    // 현재 필드는 비교 조건
    const current = fields[i];
    const operator = current.direction === 'desc' ? 'lt' : 'gt';
    condition[current.field] = {
      [operator]: castValue(cursorValues[current.field], current.type),
    };

    conditions.push(condition);
  }

  return conditions.length === 1 ? conditions[0] : { OR: conditions };
}

function castValue(
  value: unknown,
  type: KeysetFieldDef['type'],
): string | number | Date {
  switch (type) {
    case 'date':
      return value instanceof Date ? value : new Date(String(value));
    case 'number':
      return typeof value === 'number' ? value : Number(value);
    default:
      return String(value);
  }
}
