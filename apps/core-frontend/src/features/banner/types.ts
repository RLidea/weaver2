// Re-export from admin banners — same DTO shape for both admin and public responses.
// features/banner is self-contained for logic, but shares the type definition to avoid duplication.
export type { AdminBanner as Banner, BannerSlotValue } from '@/features/admin/banners/types';
