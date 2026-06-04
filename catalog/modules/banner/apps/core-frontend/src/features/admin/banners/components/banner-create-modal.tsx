'use client';

import { useState } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { useCreateBanner } from '../hooks/use-admin-banner-mutations';
import { BannerFormFields, type BannerFormValues } from './banner-form-fields';
import type { CreateBannerRequest } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

const EMPTY_FORM: BannerFormValues = {
  title: '',
  imageFileId: '',
  linkUrl: '',
  slot: 'MAIN_TOP',
  sortOrder: 0,
  isActive: true,
  startsAt: '',
  endsAt: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BannerCreateModal({ open, onClose }: Props) {
  const [values, setValues] = useState<BannerFormValues>(EMPTY_FORM);
  const { mutate, isPending } = useCreateBanner();

  const handleChange = <K extends keyof BannerFormValues>(key: K, val: BannerFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleClose = () => {
    setValues(EMPTY_FORM);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim() || !values.imageFileId) return;

    const body: CreateBannerRequest = {
      title: values.title.trim(),
      imageFileId: values.imageFileId,
      slot: values.slot,
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      ...(values.linkUrl.trim() ? { linkUrl: values.linkUrl.trim() } : {}),
      ...(values.startsAt ? { startsAt: new Date(values.startsAt).toISOString() } : {}),
      ...(values.endsAt ? { endsAt: new Date(values.endsAt).toISOString() } : {}),
    };

    mutate(body, { onSuccess: handleClose });
  };

  return (
    <Modal open={open} onClose={handleClose} title="배너 생성" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <BannerFormFields values={values} onChange={handleChange} apiBase={API_BASE} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            취소
          </Button>
          <Button
            type="submit"
            disabled={!values.title.trim() || !values.imageFileId}
            isLoading={isPending}
          >
            생성
          </Button>
        </div>
      </form>
    </Modal>
  );
}
