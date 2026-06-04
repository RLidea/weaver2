import { useQuery } from '@tanstack/react-query';
import { bannerApi } from '../api/banner.api';
import { bannerKeys } from '../query-keys';
import type { BannerSlotValue } from '../types';

export function useBannersBySlot(slot: BannerSlotValue) {
  return useQuery({
    queryKey: bannerKeys.bySlot(slot),
    queryFn: () => bannerApi.getBySlot(slot),
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  });
}
