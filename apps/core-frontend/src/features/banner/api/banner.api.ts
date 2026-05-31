import { apiClient } from '@/infrastructure/api-client';
import type { Banner, BannerSlotValue } from '../types';

export const bannerApi = {
  getBySlot: (slot: BannerSlotValue) =>
    apiClient.get<Banner[]>(`/v1/banners?slot=${slot}`),
};
