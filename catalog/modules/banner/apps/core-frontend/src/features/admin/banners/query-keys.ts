export const adminBannerKeys = {
  all: ['admin', 'banners'] as const,
  detail: (id: string) => ['admin', 'banners', id] as const,
} as const;
