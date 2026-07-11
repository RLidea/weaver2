'use client';

import { Button, Modal } from '@weaver2/ui';
import { useDeleteTerms } from '@/core/terms/hooks/use-terms-mutations';
import type { Terms } from '@/core/terms/types';

interface Props {
  terms: Terms | null;
  onClose: () => void;
}

export function AdminTermsDeleteDialog({ terms, onClose }: Props) {
  const { mutate, isPending } = useDeleteTerms();

  if (!terms) return null;

  return (
    <Modal open={!!terms} onClose={onClose} title="약관 삭제" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text">
          <span className="font-semibold text-error">{terms.title} (v{terms.version})</span>을
          삭제합니다. 사용자가 동의한 약관은 삭제할 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="danger"
            isLoading={isPending}
            onClick={() => mutate(terms.id, { onSuccess: onClose })}
          >
            삭제
          </Button>
        </div>
      </div>
    </Modal>
  );
}
