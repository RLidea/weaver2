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
  include?: any;
  select?: any;
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

  static async buildFromPrisma<T, WhereInput = any>(
    params: PrismaPaginationOptions<T, WhereInput>,
  ): Promise<OffsetResponseDto<T>> {
    const { prisma, options, where = {} as WhereInput, include, select } = params;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = options;
    const { skip, take } = this.getPaginationParams({ page, limit });
    const orderBy = parseSort(options.sort);
    const parsedFilter = parseFilter(options.filter);

    const finalWhere = { ...where, ...parsedFilter };

    const findManyArgs: any = { skip, take, where: finalWhere, orderBy };
    if (include) findManyArgs.include = include;
    if (select) findManyArgs.select = select;

    const [items, total] = await Promise.all([
      prisma.findMany(findManyArgs),
      prisma.count({ where: finalWhere }),
    ]);

    return this.buildResponse(items, total, page, limit);
  }
}
