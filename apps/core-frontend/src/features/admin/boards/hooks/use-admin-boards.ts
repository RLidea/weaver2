import { useQuery } from '@tanstack/react-query';
import { adminBoardsApi } from '../api/admin-boards.api';
import { adminBoardKeys } from '../query-keys';

export function useAdminBoards() {
  return useQuery({
    queryKey: adminBoardKeys.all,
    queryFn: () => adminBoardsApi.getAll(),
    select: (res) => res.data,
    staleTime: 30_000,
  });
}

export function useBoardPermissions(boardId: string | null) {
  return useQuery({
    queryKey: adminBoardKeys.permissions(boardId ?? ''),
    queryFn: () => adminBoardsApi.getPermissions(boardId!),
    select: (res) => res.data,
    enabled: !!boardId,
    staleTime: 30_000,
  });
}
