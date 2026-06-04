'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { useUpdateBanner } from '../hooks/use-admin-banner-mutations';
import { BannerFormFields, type BannerFormValues } from './banner-form-fields';
import type { AdminBanner, UpdateBannerRequest } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function bannerToFormValues(banner: AdminBanner): BannerFormValues {
  return {
    title: banner.title,
    imageFileId: banner.imageFileId,
    linkUrl: banner.linkUrl ?? '',
    slot: banner.slot,
    sortOrder: banner.sortOrder,
    isActive: banner.isActive,
    startsAt: isoToDatetimeLocal(banner.startsAt),
    endsAt: isoToDatetimeLocal(banner.endsAt),
  };
}

interface Props {
  banner: AdminBanner | null;
  onClose: () => void;
}

export function BannerEditModal({ banner, onClose }: Props) {
  const [values, setValues] = useState<BannerFormValues>({
    title: '',
    imageFileId: '',
    linkUrl: '',
    slot: 'MAIN_TOP',
    sortOrder: 0,
    isActive: true,
    startsAt: '',
    endsAt: '',
  });
  const { mutate, isPending } = useUpdateBanner();

  useEffect(() => {
    if (banner) {
      setValues(bannerToFormValues(banner));
    } else {
      setValues({
        title: '',
        imageFileId: '',
        linkUrl: '',
        slot: 'MAIN_TOP',
        sortOrder: 0,
        isActive: true,
        startsAt: '',
        endsAt: '',
      });
    }
  }, [banner]);

  const handleChange = <K extends keyof BannerFormValues>(key: K, val: BannerFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!banner || !values.title.trim() || !values.imageFileId) return;

    const body: UpdateBannerRequest = {
      title: values.title.trim(),
      imageFileId: values.imageFileId,
      slot: values.slot,
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      ...(values.linkUrl.trim() ? { linkUrl: values.linkUrl.trim() } : { linkUrl: null }),
      ...(values.startsAt ? { startsAt: new Date(values.startsAt).toISOString() } : { startsAt: undefined }),
      ...(values.endsAt ? { endsAt: new Date(values.endsAt).toISOString() } : { endsAt: undefined }),
    };

    mutate({ id: banner.id, body }, { onSuccess: onClose });
  };

  return (
    <Modal open={!!banner} onClose={onClose} title="배너 수정" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <BannerFormFields values={values} onChange={handleChange} apiBase={API_BASE} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            type="submit"
            disabled={!values.title.trim() || !values.imageFileId}
            isLoading={isPending}
          >
            저장
          </Button>
        </div>
      </form>
    </Modal>
  );
}
