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

export interface KeysetMeta {
  hasNextPage: boolean;
  nextCursor?: string;
}

export interface KeysetResponse<T> {
  items: T[];
  meta: KeysetMeta;
}
