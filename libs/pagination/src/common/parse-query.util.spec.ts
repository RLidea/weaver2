import { parseFilter } from './parse-filter.util';
import { parseSort } from './parse-sort.util';

describe('parseFilter · parseSort — 허용 목록은 쓰기 전에', () => {
  it('허용한 키만 남긴다', () => {
    expect(parseFilter('status:ACTIVE,secret:1', ['status'])).toEqual({
      status: 'ACTIVE',
    });
    expect(parseSort('createdAt:desc,password:asc', ['createdAt'])).toEqual({
      createdAt: 'desc',
    });
  });

  it('빈 허용 목록이면 아무것도 통과시키지 않는다', () => {
    expect(parseFilter('status:ACTIVE', [])).toEqual({});
    expect(parseSort('createdAt:desc', [])).toEqual({});
  });

  it('__proto__ 같은 이름은 허용 목록에 없으면 객체에 닿지 않는다', () => {
    const filter = parseFilter('__proto__:x,constructor:y', ['status']);
    expect(Object.keys(filter)).toEqual([]);
    expect(Object.getPrototypeOf(filter)).toBe(Object.prototype);
  });

  it('정렬 방향은 asc·desc 만 — 그 밖은 asc', () => {
    expect(parseSort('createdAt:DROP', ['createdAt'])).toEqual({
      createdAt: 'asc',
    });
  });
});
