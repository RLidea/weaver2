import { useQuery } from '@tanstack/react-query';
import { boardApi } from '../api/board.api';
import { boardKeys } from '../query-keys';

export function useBoard(id: string) {
  return useQuery({
    queryKey: boardKeys.detail(id),
    queryFn: () => boardApi.getById(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}
