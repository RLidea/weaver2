export interface OffsetMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OffsetResponse<T> {
  items: T[];
  meta: OffsetMeta;
}

export interface KeysetResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit?: number;
}
