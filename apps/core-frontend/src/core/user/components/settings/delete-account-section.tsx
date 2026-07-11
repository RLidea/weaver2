'use client';

import { useState } from 'react';
import { useDeleteAccount } from '@/core/user/hooks/use-delete-account';
import { Button, Card, CardContent, CardHeader, Input, useToast } from '@weaver2/ui';
import { ApiError } from '@/types/api';

export function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { mutate: deleteAccount, isPending } = useDeleteAccount();
  const toast = useToast();

  const CONFIRM_PHRASE = '계정을 삭제합니다';
  const isConfirmed = confirmText === CONFIRM_PHRASE;

  function handleDelete() {
    deleteAccount(undefined, {
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : '계정 삭제에 실패했습니다.';
        toast.error(message);
      },
    });
  }

  return (
    <Card className="border-error/40">
      <CardHeader>
        <h2 className="text-base font-semibold text-error">위험 구역</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text">계정 삭제</p>
            <p className="text-xs text-text-muted">
              계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
            </p>
          </div>
          {!showConfirm && (
            <Button
              variant="danger"
              size="sm"
              className="shrink-0"
              onClick={() => setShowConfirm(true)}
            >
              계정 삭제
            </Button>
          )}
        </div>

        {showConfirm && (
          <div className="space-y-3 rounded-md border border-error/30 bg-error/5 p-4">
            <p className="text-sm text-text">
              계속하려면 아래에{' '}
              <span className="font-semibold text-error">{CONFIRM_PHRASE}</span>
              를 입력하세요.
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmText('');
                }}
              >
                취소
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!isConfirmed || isPending}
                isLoading={isPending}
                onClick={handleDelete}
              >
                영구 삭제
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
