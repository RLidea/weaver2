import { buildKeysetWhere } from './keyset.builder';
import { KeysetFieldDef } from './keyset.presets';

type FieldCondition = Record<string, unknown>;
type WhereWithOR = { OR: FieldCondition[] };

describe('buildKeysetWhere', () => {
  const cursorValues = {
    createdAt: '2024-01-15T09:00:00.000Z',
    viewCount: 42,
    id: 'uuid-123',
  };

  it('단일 필드 DESC → lt 조건 생성', () => {
    const fields: KeysetFieldDef[] = [
      { field: 'createdAt', direction: 'desc', type: 'date' },
    ];
    const result = buildKeysetWhere(fields, cursorValues);
    expect(result).toEqual({
      createdAt: { lt: new Date('2024-01-15T09:00:00.000Z') },
    });
  });

  it('단일 필드 ASC → gt 조건 생성', () => {
    const fields: KeysetFieldDef[] = [
      { field: 'id', direction: 'asc', type: 'string' },
    ];
    const result = buildKeysetWhere(fields, cursorValues);
    expect(result).toEqual({ id: { gt: 'uuid-123' } });
  });

  it('복합 2필드 (DESC, ASC) → OR 조건 생성', () => {
    const fields: KeysetFieldDef[] = [
      { field: 'createdAt', direction: 'desc', type: 'date' },
      { field: 'id', direction: 'asc', type: 'string' },
    ];
    const result = buildKeysetWhere(fields, cursorValues);
    expect(result).toEqual({
      OR: [
        { createdAt: { lt: new Date('2024-01-15T09:00:00.000Z') } },
        {
          createdAt: new Date('2024-01-15T09:00:00.000Z'),
          id: { gt: 'uuid-123' },
        },
      ],
    });
  });

  it('복합 3필드 → OR 조건 3개 생성', () => {
    const fields: KeysetFieldDef[] = [
      { field: 'viewCount', direction: 'desc', type: 'number' },
      { field: 'createdAt', direction: 'desc', type: 'date' },
      { field: 'id', direction: 'asc', type: 'string' },
    ];
    const result = buildKeysetWhere(fields, cursorValues) as WhereWithOR;
    expect(result.OR).toHaveLength(3);
    expect(result.OR[0]).toEqual({ viewCount: { lt: 42 } });
    expect(result.OR[1]).toEqual({
      viewCount: 42,
      createdAt: { lt: new Date('2024-01-15T09:00:00.000Z') },
    });
    expect(result.OR[2]).toEqual({
      viewCount: 42,
      createdAt: new Date('2024-01-15T09:00:00.000Z'),
      id: { gt: 'uuid-123' },
    });
  });

  it('number 타입 캐스팅', () => {
    const fields: KeysetFieldDef[] = [
      { field: 'viewCount', direction: 'desc', type: 'number' },
    ];
    const result = buildKeysetWhere(fields, { viewCount: '42' });
    expect(result).toEqual({ viewCount: { lt: 42 } });
    const viewCountCond = result.viewCount as { lt: number };
    expect(typeof viewCountCond.lt).toBe('number');
  });

  it('date 타입 캐스팅 - 문자열을 Date 객체로 변환', () => {
    const fields: KeysetFieldDef[] = [
      { field: 'createdAt', direction: 'desc', type: 'date' },
    ];
    const result = buildKeysetWhere(fields, {
      createdAt: '2024-01-15T09:00:00.000Z',
    });
    const createdAtCond = result.createdAt as { lt: Date };
    expect(createdAtCond.lt).toBeInstanceOf(Date);
  });
});
