'use client';

import { BannerSlot } from './components/banner-slot';
import { PopupBanner } from './components/popup-banner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// codegen이 읽는 표준 export 이름: dashboardSlots (슬롯명 → 컴포넌트)
export const dashboardSlots = {
  'dashboard-top': () => <BannerSlot slot="MAIN_TOP" apiBase={API_BASE} />,
  'global-popup': () => <PopupBanner apiBase={API_BASE} />,
};
