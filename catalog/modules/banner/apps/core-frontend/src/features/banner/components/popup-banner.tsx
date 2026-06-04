'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { useBannersBySlot } from '../hooks/use-banners';
import { bannerImageUrl } from '../lib/banner-image-url';

const DISMISS_KEY = 'banner-popup-dismissed-date';

export function PopupBanner({ apiBase }: { apiBase: string }) {
  const { data: banners = [] } = useBannersBySlot('POPUP');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (banners.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(DISMISS_KEY) !== today) setOpen(true);
  }, [banners]);

  if (banners.length === 0) return null;
  const b = banners[0];

  const dismissToday = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString().slice(0, 10));
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} title={b.title} size="md">
      <div className="space-y-4">
        {b.linkUrl ? (
          <a href={b.linkUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={bannerImageUrl(apiBase, b.imageFileId)}
              alt={b.title}
              className="w-full rounded-md"
            />
          </a>
        ) : (
          <img
            src={bannerImageUrl(apiBase, b.imageFileId)}
            alt={b.title}
            className="w-full rounded-md"
          />
        )}
        <div className="flex justify-between">
          <Button variant="ghost" onClick={dismissToday}>
            오늘 그만보기
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            닫기
          </Button>
        </div>
      </div>
    </Modal>
  );
}
