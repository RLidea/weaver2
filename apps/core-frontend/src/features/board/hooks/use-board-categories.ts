import { useQuery } from '@tanstack/react-query';
import { boardApi } from '../api/board.api';
import { boardKeys } from '../query-keys';

export function useBoardCategories(boardId: string) {
  return useQuery({
    queryKey: boardKeys.categories(boardId),
    queryFn: () => boardApi.getCategories(boardId),
    select: (res) => res.data,
    enabled: !!boardId,
  });
}
