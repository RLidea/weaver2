'use client';

import { ConfirmDialog } from '@weaver2/ui';
import { useRevokeApiToken } from '../hooks/use-admin-api-token-mutations';
import type { ApiToken } from '../types';

interface Props {
  token: ApiToken | null;
  onClose: () => void;
}

export function ApiTokenRevokeDialog({ token, onClose }: Props) {
  const { mutate, isPending } = useRevokeApiToken();

  return (
    <ConfirmDialog
      open={!!token}
      title="토큰 끊기"
      message={
        <>
          <span className="font-semibold">{token?.name}</span> 토큰을 끊습니다. 이 토큰을 쓰는 곳은 바로
          막히고, 다시 살릴 수 없습니다.
        </>
      }
      confirmText="끊기"
      danger
      pending={isPending}
      onConfirm={() => token && mutate(token.id, { onSuccess: onClose })}
      onClose={onClose}
    />
  );
}
