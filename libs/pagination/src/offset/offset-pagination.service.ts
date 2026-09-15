import { parseFilter } from '../common/parse-filter.util';
import { parseSort } from '../common/parse-sort.util';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../common/constants';
import { OffsetResponseDto } from './dto/offset-response.dto';

// 사용자 입력에서 파싱한 키/값 맵을, allowlist 에 있는 키만 남겨 되돌린다.
// allowlist 가 없으면(undefined) 전부 버린다 — deny-by-default.
// 사용자 입력이 그대로 Prisma where·orderBy 의 컬럼명이 되는 것을 막는 관문이다
// (CodeQL js/remote-property-injection). 라이브러리 한 곳에서 막으므로, 이걸 쓰는
// 모든 목록이 자동으로 안전하고, 열려는 목록만 allowlist 를 명시한다.
function pickAllowed<V>(
  parsed: Record<string, V>,
  allowed?: readonly string[],
): Record<string, V> {
  if (!allowed || allowed.length === 0) return {};
  const result: Record<string, V> = {};
  for (const key of Object.keys(parsed)) {
    if (allowed.includes(key)) result[key] = parsed[key];
  }
  return result;
}

interface PrismaPaginationOptions<T, WhereInput> {
  prisma: {
    findMany: (args: any) => Promise<T[]>;

    count: (args: any) => Promise<number>;
  };
  options: {
    page?: number;
    limit?: number;
    sort?: string;
    filter?: string;
  };
  where?: WhereInput;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
  // 자유형 `filter` 문자열(`컬럼:값,...`)에서 **여기 나열된 필드만** Prisma where 로
  // 넘긴다. 지정하지 않으면(기본) 자유형 filter 는 where 에 전혀 반영되지 않는다.
  //
  // 왜 deny-by-default 인가: filter 는 사용자 입력이 그대로 컬럼명이 되어 where 로
  // spread 됐다(CodeQL js/remote-property-injection). 인증·권한 뒤이긴 하나, 권한자가
  // 의도하지 않은 컬럼(내부 플래그·토큰류)을 equality 로 좁혀 값을 유추하는 길이 된다.
  // 실측(2026-09-15): 프론트는 이 자유형 filter 를 보내지 않는다(구조화된 status·search
  // 파라미터를 쓴다). 그래서 기본을 「차단」으로 두어도 아무 기능이 깨지지 않는다.
  // 자유형 filter 가 정말 필요한 목록이 생기면, 그 목록만 이 allowlist 를 명시한다.
  filterableFields?: readonly string[];
  // `sort` 문자열(`컬럼:asc,...`)에서 **여기 나열된 필드만** orderBy 로 넘긴다.
  // 지정하지 않으면(기본) 사용자 sort 는 orderBy 에 반영되지 않는다.
  //
  // filter 와 같은 결의 위험이다(CodeQL js/remote-property-injection, parse-sort) —
  // 사용자 입력이 그대로 orderBy 컬럼이 되어, 정렬 순서로 숨은 컬럼 값을 유추하는
  // oracle 이 된다. 다만 filter 와 달리 sort 는 프론트가 실제로 쓰므로(정렬 드롭다운)
  // 전부 막을 수 없다 — UI 가 실제로 주는 컬럼만 연다. 그 목록은 저장소마다 다르니
  // 호출자가 자기 UI 를 보고 명시한다 (예: user 목록 → createdAt·displayName).
  sortableFields?: readonly string[];
}

export class OffsetPaginationService {
  static getPaginationParams(query: { page?: number; limit?: number }) {
    const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
    const limit = query.limit && query.limit > 0 ? query.limit : DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    return { skip, take: limit, page, limit };
  }

  static buildResponse<T>(
    items: T[],
    totalItems: number,
    page: number,
    limit: number,
  ): OffsetResponseDto<T> {
    const lastPage = Math.max(Math.ceil(totalItems / limit), 1);
    return {
      total: totalItems,
      limit,
      currentItemCount: items.length,
      currentPage: page,
      firstPage: 1,
      lastPage,
      nextPage: page < lastPage ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      data: items,
    };
  }

  static async buildFromPrisma<T, WhereInput = Record<string, unknown>>(
    params: PrismaPaginationOptions<T, WhereInput>,
  ): Promise<OffsetResponseDto<T>> {
    const {
      prisma,
      options,
      where = {} as WhereInput,
      include,
      select,
      filterableFields,
      sortableFields,
    } = params;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = options;
    const { skip, take } = this.getPaginationParams({ page, limit });

    // 사용자 sort·filter 는 각각 allowlist 에 있는 키만 통과시킨다. 기본(allowlist
    // 미지정)은 전부 차단 — 위 sortableFields·filterableFields 주석 참조.
    const orderBy = pickAllowed(parseSort(options.sort), sortableFields);
    const safeFilter = pickAllowed(
      parseFilter(options.filter),
      filterableFields,
    );

    const finalWhere = { ...where, ...safeFilter };

    const findManyArgs: Record<string, unknown> = {
      skip,
      take,
      where: finalWhere,
      orderBy,
    };
    if (include) findManyArgs.include = include;
    if (select) findManyArgs.select = select;

    const [items, total] = await Promise.all([
      prisma.findMany(findManyArgs),
      prisma.count({ where: finalWhere }),
    ]);

    return this.buildResponse(items, total, page, limit);
  }
}
