import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { searchApi } from '../api/search.api';
import { searchKeys } from '../query-keys';
import type { SearchParams } from '../types';

export function useSearch(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: searchKeys.results(params),
    queryFn: () => searchApi.search(params),
    select: (res) => res.data,
    enabled: enabled && params.q.trim().length > 0,
    staleTime: 60 * 1000, // 동일 검색어 재요청 시 1분간 캐시 활용
    placeholderData: keepPreviousData, // 타이핑 중 이전 결과를 유지해 UX 개선
  });
}
