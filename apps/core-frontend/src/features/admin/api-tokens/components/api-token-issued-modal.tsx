'use client';

import { Button, Modal, useToast } from '@weaver2/ui';
import type { IssuedApiToken } from '../types';

interface Props {
  issued: IssuedApiToken | null;
  onClose: () => void;
}

/** 원문을 보이는 단 한 번 — 닫으면 서버에도 화면에도 남지 않는다 */
export function ApiTokenIssuedModal({ issued, onClose }: Props) {
  const toast = useToast();

  const handleCopy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.token);
      toast.success('토큰을 복사했습니다.');
    } catch {
      toast.error('복사하지 못했습니다. 직접 골라 복사해 주세요.');
    }
  };

  return (
    <Modal open={!!issued} onClose={onClose} title="토큰을 발급했습니다" size="md">
      <div className="space-y-4">
        <p className="text-sm text-text">
          <span className="font-semibold text-error">이 창을 닫으면 다시 볼 수 없습니다.</span> 지금 복사해
          쓰는 곳의 비밀 저장소에 넣어 두세요.
        </p>
        <code
          aria-label="발급한 토큰"
          className="block break-all rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-text select-all"
        >
          {issued?.token}
        </code>
        <p className="text-xs text-text-muted">
          요청 머리에 <code>Authorization: Bearer &lt;토큰&gt;</code> 으로 싣습니다.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => void handleCopy()}>
            복사
          </Button>
          <Button onClick={onClose}>닫기</Button>
        </div>
      </div>
    </Modal>
  );
}
