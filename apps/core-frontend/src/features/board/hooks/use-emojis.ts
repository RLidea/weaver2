import { useQuery } from '@tanstack/react-query';
import { emojiApi } from '../api/emoji.api';
import { emojiKeys } from '../query-keys';

export function useEmojis() {
  return useQuery({
    queryKey: emojiKeys.all,
    queryFn: () => emojiApi.getAll(),
    select: (res) => res.data,
    staleTime: 1000 * 60 * 10, // 10분 캐시
  });
}
