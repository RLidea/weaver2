export type BannerSlotValue = 'MAIN_TOP' | 'MAIN_BOTTOM' | 'SIDEBAR' | 'POPUP';

export interface AdminBanner {
  id: string;
  title: string;
  imageFileId: string;
  linkUrl: string | null;
  slot: BannerSlotValue;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerRequest {
  title: string;
  imageFileId: string;
  linkUrl?: string;
  slot: BannerSlotValue;
  isActive?: boolean;
  sortOrder?: number;
  startsAt?: string;
  endsAt?: string;
}

export type UpdateBannerRequest = Partial<CreateBannerRequest>;

export const BANNER_SLOTS: { value: BannerSlotValue; label: string }[] = [
  { value: 'MAIN_TOP', label: '메인 상단' },
  { value: 'MAIN_BOTTOM', label: '메인 하단' },
  { value: 'SIDEBAR', label: '사이드바' },
  { value: 'POPUP', label: '팝업' },
];
