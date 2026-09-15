/**
 * OffsetPaginationService.buildFromPrisma 의 자유형 filter 차단 회귀 시험.
 *
 * 배경(2026-09-15): 자유형 `filter` 문자열(`컬럼:값`)이 그대로 Prisma where 로
 * spread 되고 있었다(CodeQL js/remote-property-injection). 권한자가 의도하지 않은
 * 컬럼을 equality 로 좁혀 값을 유추하는 길이었다. 프론트가 이 자유형 filter 를
 * 쓰지 않으므로(구조화된 status·search 만 씀) allowlist deny-by-default 로 막았다.
 *
 * 이 시험은 「filter 가 where 에 안 닿는다」를 prisma.findMany 로 넘어간 실제
 * 인자로 못박는다 — 문자열 검사가 아니라 싱크에서 확인한다.
 */
import { OffsetPaginationService } from './offset-pagination.service';

// prisma 스텁 — findMany 에 넘어온 args(특히 where)를 붙잡는다.
function makePrismaSpy() {
  const calls: Array<Record<string, unknown>> = [];
  return {
    calls,
    prisma: {
      findMany: (args: Record<string, unknown>) => {
        calls.push(args);
        return Promise.resolve([]);
      },
      count: () => Promise.resolve(0),
    },
  };
}

describe('OffsetPaginationService — 자유형 filter 차단', () => {
  it('allowlist 없으면 filter 가 where 에 반영되지 않는다', async () => {
    const spy = makePrismaSpy();
    await OffsetPaginationService.buildFromPrisma({
      prisma: spy.prisma,
      options: { filter: 'passwordHash:leaked,role:ADMIN' },
      where: { deletedAt: null },
    });
    const whereArg = spy.calls[0].where as Record<string, unknown>;
    // 명시한 where 만 남고, 사용자가 넣은 컬럼은 전부 빠져야 한다.
    expect(whereArg).toEqual({ deletedAt: null });
    expect(whereArg).not.toHaveProperty('passwordHash');
    expect(whereArg).not.toHaveProperty('role');
  });

  it('allowlist 에 있는 필드만 통과시킨다', async () => {
    const spy = makePrismaSpy();
    await OffsetPaginationService.buildFromPrisma({
      prisma: spy.prisma,
      options: { filter: 'status:ACTIVE,passwordHash:leaked' },
      where: {},
      filterableFields: ['status'],
    });
    const whereArg = spy.calls[0].where as Record<string, unknown>;
    // 허용된 status 는 통과, 허용 안 된 passwordHash 는 차단.
    expect(whereArg).toEqual({ status: 'ACTIVE' });
    expect(whereArg).not.toHaveProperty('passwordHash');
  });
});
