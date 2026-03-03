export interface OffsetResponse<T> {
  data: T[];
  total: number;
  limit: number;
  currentItemCount: number;
  currentPage: number;
  firstPage: number;
  lastPage: number;
  nextPage: number | null;
  prevPage: number | null;
}

export interface KeysetResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit?: number;
}
