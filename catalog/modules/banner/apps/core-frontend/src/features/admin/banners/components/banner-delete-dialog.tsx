'use client';

import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { useDeleteBanner } from '../hooks/use-admin-banner-mutations';
import type { AdminBanner } from '../types';

interface Props {
  banner: AdminBanner | null;
  onClose: () => void;
}

export function BannerDeleteDialog({ banner, onClose }: Props) {
  const { mutate, isPending } = useDeleteBanner();

  if (!banner) return null;

  const handleDelete = () => {
    mutate(banner.id, { onSuccess: onClose });
  };

  return (
    <Modal open={!!banner} onClose={onClose} title="배너 삭제" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text">
          <span className="font-semibold text-error">{banner.title}</span> 배너를 삭제합니다.
          이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button variant="danger" isLoading={isPending} onClick={handleDelete}>
            삭제
          </Button>
        </div>
      </div>
    </Modal>
  );
}
