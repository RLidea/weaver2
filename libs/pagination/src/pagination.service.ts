import { PaginationResponseDto } from './dto/pagination-response.dto';

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
}

export class PaginationService {
  static getPaginationParams(query: { page?: number; limit?: number }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    return { skip, take: limit, page, limit };
  }

  static buildResponse<T>(
    items: T[],
    totalItems: number,
    page: number,
    limit: number,
  ): PaginationResponseDto<T> {
    const currentItemCount = items.length;
    const lastPage = Math.max(Math.ceil(totalItems / limit), 1);
    const firstPage = 1;

    return {
      total: totalItems,
      limit,
      currentItemCount,
      currentPage: page,
      firstPage,
      lastPage,
      nextPage: page < lastPage ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      data: items,
    };
  }

  static parseSort(sort?: string): Record<string, 'asc' | 'desc'> {
    const result: Record<string, 'asc' | 'desc'> = {};
    if (!sort) return result;
    const parts = sort.split(',');
    for (const part of parts) {
      const [field, order] = part.split(':');
      if (field)
        result[field.trim()] = (order?.trim() as 'asc' | 'desc') || 'asc';
    }
    return result;
  }

  static parseFilter(filter?: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!filter) return result;
    const parts = filter.split(',');
    for (const part of parts) {
      const [key, value] = part.split(':');
      if (key && value) result[key.trim()] = value.trim();
    }
    return result;
  }

  static async buildFromPrisma<T, WhereInput = any>(
    params: PrismaPaginationOptions<T, WhereInput>,
  ): Promise<PaginationResponseDto<T>> {
    const { prisma, options, where = {} } = params;
    const { page = 1, limit = 10 } = options;
    const { skip, take } = this.getPaginationParams({ page, limit });
    const orderBy = this.parseSort(options.sort);
    const parsedFilter = this.parseFilter(options.filter);

    const finalWhere = {
      ...where,
      ...parsedFilter,
    };

    const [items, total] = await Promise.all([
      prisma.findMany({
        skip,
        take,
        where: finalWhere,
        orderBy,
      }),
      prisma.count({
        where: finalWhere,
      }),
    ]);

    return this.buildResponse(items, total, page, limit);
  }
}
