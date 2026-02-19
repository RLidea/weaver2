export class KeysetResponseDto<T> {
  data: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}
