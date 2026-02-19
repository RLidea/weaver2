export class CursorResponseDto<T> {
  data: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}
