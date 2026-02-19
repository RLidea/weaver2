export class OffsetResponseDto<T> {
  total: number;
  limit: number;
  currentItemCount: number;
  currentPage: number;
  firstPage: number;
  lastPage: number;
  nextPage: number | null;
  prevPage: number | null;
  data: T[];
}
