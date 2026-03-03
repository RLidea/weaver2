import { useQuery } from '@tanstack/react-query';
import { boardApi } from '../api/board.api';
import { boardKeys } from '../query-keys';

export function useBoards() {
  return useQuery({
    queryKey: boardKeys.lists,
    queryFn: boardApi.getAll,
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000, // 게시판 목록은 자주 변하지 않음
  });
}
