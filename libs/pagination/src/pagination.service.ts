import { parseFilter } from './common/parse-filter.util';
import { parseSort } from './common/parse-sort.util';
import { OffsetPaginationService } from './offset/offset-pagination.service';
import { PaginationResponseDto } from './dto/pagination-response.dto';

/**
 * @deprecated Use OffsetPaginationService, CursorPaginationService, or KeysetPaginationService.
 */
export class PaginationService {
  /** @deprecated Use OffsetPaginationService.getPaginationParams */
  static getPaginationParams(query: { page?: number; limit?: number }) {
    return OffsetPaginationService.getPaginationParams(query);
  }

  /** @deprecated Use OffsetPaginationService.buildResponse */
  static buildResponse<T>(
    items: T[],
    totalItems: number,
    page: number,
    limit: number,
  ): PaginationResponseDto<T> {
    return OffsetPaginationService.buildResponse(items, totalItems, page, limit);
  }

  /** @deprecated Use parseSort from '@weaver2/pagination' */
  static parseSort(sort?: string) {
    return parseSort(sort);
  }

  /** @deprecated Use parseFilter from '@weaver2/pagination' */
  static parseFilter(filter?: string) {
    return parseFilter(filter);
  }

  /** @deprecated Use OffsetPaginationService.buildFromPrisma */
  static buildFromPrisma<T, WhereInput = any>(params: Parameters<typeof OffsetPaginationService.buildFromPrisma<T, WhereInput>>[0]) {
    return OffsetPaginationService.buildFromPrisma(params);
  }
}
