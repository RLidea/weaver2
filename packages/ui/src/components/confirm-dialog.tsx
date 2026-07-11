'use client';

import type { ReactNode } from 'react';
import { Modal } from './modal';
import { Button } from './button';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** 위험 액션은 confirm 버튼을 error 컬러로 강조 */
  danger?: boolean;
  /** mutate가 진행 중일 때 버튼 disable */
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * 브라우저 `window.confirm()` 대체용 글래스모피즘 확인 모달.
 *
 * 사용 예:
 *   const [open, setOpen] = useState(false);
 *   <ConfirmDialog
 *     open={open}
 *     title="삭제 확인"
 *     message="이 댓글을 삭제할까요?"
 *     danger
 *     onConfirm={() => { delete(); setOpen(false); }}
 *     onClose={() => setOpen(false)}
 *   />
 */
export function ConfirmDialog({
  open,
  title = '확인',
  message,
  confirmText = '확인',
  cancelText = '취소',
  danger = false,
  pending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-sm text-text">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={pending}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
