'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal } from '@weaver2/ui';
import { useUpdateAdminUser } from '../hooks/use-admin-user-mutations';
import type { AdminUser, AdminUpdateUserRequest } from '../types';

interface UserEditModalProps {
  user: AdminUser | null;
  onClose: () => void;
}

export function UserEditModal({ user, onClose }: UserEditModalProps) {
  const { mutate, isPending } = useUpdateAdminUser();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdminUpdateUserRequest>();

  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName,
        username: user.username,
        email: user.email ?? '',
      });
    }
  }, [user, reset]);

  const onSubmit = (data: AdminUpdateUserRequest) => {
    if (!user) return;
    mutate(
      { id: user.id, body: data },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal open={!!user} onClose={onClose} title="사용자 수정" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="표시 이름"
          {...register('displayName', { required: '표시 이름을 입력하세요.' })}
          error={errors.displayName?.message}
        />
        <Input
          label="사용자명"
          {...register('username', { required: '사용자명을 입력하세요.' })}
          error={errors.username?.message}
        />
        <Input
          label="이메일"
          type="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
          <Button type="submit" isLoading={isPending}>저장</Button>
        </div>
      </form>
    </Modal>
  );
}
