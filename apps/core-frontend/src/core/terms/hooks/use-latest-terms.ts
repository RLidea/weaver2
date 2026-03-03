import { useQuery } from '@tanstack/react-query';
import { termsApi } from '../api/terms.api';
import { termsKeys } from '../query-keys';

export function useLatestTerms() {
  return useQuery({
    queryKey: termsKeys.latest,
    queryFn: () => termsApi.getLatest(),
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000, // 약관은 자주 바뀌지 않으므로 5분 캐시
  });
}
