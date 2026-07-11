'use client';

import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Select } from '@weaver2/ui';
import { useSuspendUser, useUnsuspendUser } from '../hooks/use-admin-user-mutations';
import { getUserStatus, type AdminUser, type SuspendUserRequest } from '../types';

interface UserSuspendModalProps {
  user: AdminUser | null;
  onClose: () => void;
}

const DURATION_OPTIONS = [
  { value: '1', label: '1일' },
  { value: '7', label: '7일' },
  { value: '30', label: '30일' },
  { value: '0', label: '영구 정지' },
];

interface FormValues {
  days: string;
  reason: string;
}

export function UserSuspendModal({ user, onClose }: UserSuspendModalProps) {
  const { mutate: suspend, isPending: isSuspending } = useSuspendUser();
  const { mutate: unsuspend, isPending: isUnsuspending } = useUnsuspendUser();
  const { register, handleSubmit } = useForm<FormValues>({ defaultValues: { days: '7', reason: '' } });

  if (!user) return null;

  const isSuspended = getUserStatus(user) === 'suspended';

  const onSubmit = (data: FormValues) => {
    const body: SuspendUserRequest = {
      days: data.days === '0' ? undefined : Number(data.days),
      reason: data.reason || undefined,
    };
    suspend({ id: user.id, body }, { onSuccess: onClose });
  };

  const handleUnsuspend = () => {
    unsuspend(user.id, { onSuccess: onClose });
  };

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={isSuspended ? '정지 해제' : '사용자 정지'}
      size="sm"
    >
      {isSuspended ? (
        <div className="space-y-4">
          <p className="text-sm text-text">
            <span className="font-semibold">{user.displayName}</span> 님의 정지를 해제하시겠습니까?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>취소</Button>
            <Button onClick={handleUnsuspend} isLoading={isUnsuspending}>정지 해제</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-text-muted">
            <span className="font-semibold text-text">{user.displayName}</span> 님을 정지합니다.
          </p>
          <Select
            label="정지 기간"
            options={DURATION_OPTIONS}
            {...register('days')}
          />
          <Input
            label="사유 (선택)"
            placeholder="정지 사유를 입력하세요."
            {...register('reason')}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
            <Button type="submit" variant="danger" isLoading={isSuspending}>정지</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
