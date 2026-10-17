'use client';

import { Button, Modal } from '@weaver2/ui';
import { useResetUserTwoFactor } from '../hooks/use-admin-user-mutations';
import type { AdminUser } from '../types';

interface UserTwoFactorResetDialogProps {
  user: AdminUser | null;
  onClose: () => void;
}

/** 인증 앱을 잃은 사용자의 2단계 인증을 초기화한다 — 본인 확인을 마친 뒤에만 쓴다. */
export function UserTwoFactorResetDialog({ user, onClose }: UserTwoFactorResetDialogProps) {
  const { mutate, isPending } = useResetUserTwoFactor();

  if (!user) return null;

  const handleReset = () => {
    mutate(user.id, { onSuccess: onClose });
  };

  return (
    <Modal open={!!user} onClose={onClose} title="2단계 인증 초기화" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text">
          <span className="font-semibold">{user.displayName}</span> 님의 2단계 인증(인증 앱·이메일)을
          모두 해제합니다. 다음 로그인부터 비밀번호만으로 들어올 수 있으니,{' '}
          <span className="font-semibold text-error">본인임을 먼저 확인한 경우에만</span> 진행하세요.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button variant="danger" isLoading={isPending} onClick={handleReset}>
            초기화
          </Button>
        </div>
      </div>
    </Modal>
  );
}
