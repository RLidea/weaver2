'use client';

import { useId, useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import { useToast } from '@/infrastructure/providers/toast-provider';
import { bannerUploadApi } from '../api/banner-upload.api';
import { BANNER_SLOTS, type BannerSlotValue } from '../types';

export interface BannerFormValues {
  title: string;
  imageFileId: string;
  linkUrl: string;
  slot: BannerSlotValue;
  sortOrder: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

interface Props {
  values: BannerFormValues;
  onChange: <K extends keyof BannerFormValues>(key: K, val: BannerFormValues[K]) => void;
  apiBase: string;
}

export function BannerFormFields({ values, onChange, apiBase }: Props) {
  const toast = useToast();
  const checkboxId = useId();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const uploaded = await bannerUploadApi.uploadImage(file);
      onChange('imageFileId', uploaded.id);
    } catch {
      const msg = '이미지 업로드에 실패했습니다.';
      setUploadError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="제목"
        value={values.title}
        onChange={(e) => onChange('title', e.target.value)}
        required
        autoFocus
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text">이미지</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImage}
          className="text-sm text-text-muted"
        />
        {uploadError && (
          <p className="text-sm text-error">{uploadError}</p>
        )}
        {values.imageFileId && (
          <img
            src={`${apiBase}/v1/upload/${values.imageFileId}/file`}
            alt="미리보기"
            className="mt-2 h-24 w-auto rounded-md border border-border object-cover"
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text">슬롯</label>
        <select
          value={values.slot}
          onChange={(e) => onChange('slot', e.target.value as BannerSlotValue)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
        >
          {BANNER_SLOTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="링크 URL (선택)"
        value={values.linkUrl}
        onChange={(e) => onChange('linkUrl', e.target.value)}
        placeholder="https://..."
      />
      <Input
        label="순서"
        type="number"
        value={String(values.sortOrder)}
        onChange={(e) => onChange('sortOrder', Number(e.target.value))}
      />
      <Input
        label="게시 시작 (선택)"
        type="datetime-local"
        value={values.startsAt}
        onChange={(e) => onChange('startsAt', e.target.value)}
      />
      <Input
        label="게시 종료 (선택)"
        type="datetime-local"
        value={values.endsAt}
        onChange={(e) => onChange('endsAt', e.target.value)}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={checkboxId}
          checked={values.isActive}
          onChange={(e) => onChange('isActive', e.target.checked)}
          className="rounded"
        />
        <label htmlFor={checkboxId} className="text-sm text-text">
          활성
        </label>
      </div>
    </div>
  );
}
