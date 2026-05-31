'use client';

import { useId, useRef, useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { ImageIcon } from '@/shared/components/ui/icons';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const uploaded = await bannerUploadApi.uploadImage(file);
      onChange('imageFileId', uploaded.id);
    } catch {
      const msg = '이미지 업로드에 실패했습니다.';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
      // 같은 파일을 다시 선택해도 onChange가 발생하도록 초기화
      if (fileInputRef.current) fileInputRef.current.value = '';
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

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text">이미지</label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImage}
          className="hidden"
        />

        {values.imageFileId ? (
          <div className="flex items-start gap-3">
            <img
              src={`${apiBase}/v1/upload/${values.imageFileId}/file`}
              alt="미리보기"
              className="h-24 w-auto rounded-md border border-border object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
              이미지 변경
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-2 text-text-muted transition-colors hover:border-primary hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ImageIcon className="h-6 w-6" />
            <span className="text-sm">{isUploading ? '업로드 중…' : '이미지 선택'}</span>
          </button>
        )}

        {uploadError && <p className="text-sm text-error">{uploadError}</p>}
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
