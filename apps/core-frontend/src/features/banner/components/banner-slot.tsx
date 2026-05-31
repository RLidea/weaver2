'use client';

import { useBannersBySlot } from '../hooks/use-banners';
import { bannerImageUrl } from '../lib/banner-image-url';
import type { BannerSlotValue } from '../types';

interface Props {
  slot: BannerSlotValue;
  apiBase: string;
}

export function BannerSlot({ slot, apiBase }: Props) {
  const { data: banners = [] } = useBannersBySlot(slot);
  if (banners.length === 0) return null;

  return (
    <div className="space-y-3">
      {banners.map((b) => {
        const img = (
          <img
            src={bannerImageUrl(apiBase, b.imageFileId)}
            alt={b.title}
            className="w-full rounded-lg border border-border object-cover"
          />
        );
        return b.linkUrl ? (
          <a
            key={b.id}
            href={b.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-opacity hover:opacity-90"
          >
            {img}
          </a>
        ) : (
          <div key={b.id}>{img}</div>
        );
      })}
    </div>
  );
}
