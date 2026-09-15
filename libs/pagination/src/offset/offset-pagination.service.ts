import { parseFilter } from '../common/parse-filter.util';
import { parseSort } from '../common/parse-sort.util';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../common/constants';
import { OffsetResponseDto } from './dto/offset-response.dto';

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
    } = params;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = options;
    const { skip, take } = this.getPaginationParams({ page, limit });
    // ⚠ 남은 위험: parseSort(options.sort) 도 사용자 입력이 그대로 orderBy 컬럼이 된다
    //   (CodeQL js/remote-property-injection, parse-sort.util). filter 와 달리 sort 는
    //   프론트가 실제로 쓰므로(정렬 드롭다운) 여기서 못 막는다 — 엔티티별 「정렬 허용
    //   컬럼」 allowlist 가 필요하고, 그건 목록마다 다른 설계 판단이라 별건으로 둔다.
    const orderBy = parseSort(options.sort);

    // 자유형 filter 는 allowlist 에 있는 키만 통과시킨다. 기본(allowlist 미지정)은
    // 전부 차단 — 위 filterableFields 주석 참조.
    const parsedFilter = parseFilter(options.filter);
    const safeFilter = filterableFields
      ? Object.fromEntries(
          Object.entries(parsedFilter).filter(([key]) =>
            filterableFields.includes(key),
          ),
        )
      : {};

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
