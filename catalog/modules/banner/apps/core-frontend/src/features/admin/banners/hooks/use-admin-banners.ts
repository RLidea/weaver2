import { useQuery } from '@tanstack/react-query';
import { adminBannersApi } from '../api/admin-banners.api';
import { adminBannerKeys } from '../query-keys';

export function useAdminBanners() {
  return useQuery({
    queryKey: adminBannerKeys.all,
    queryFn: () => adminBannersApi.getAll(),
    select: (res) => res.data,
    staleTime: 30_000,
  });
}
