'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMe } from '@/core/user/hooks/use-me';
import { useUpdateProfile } from '@/core/user/hooks/use-update-profile';
import { useToast } from '@/infrastructure/providers/toast-provider';
import { ApiError } from '@/types/api';
import { Card, CardHeader, CardContent, CardFooter } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';

const ProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, '이름을 입력해주세요')
    .max(50, '50자 이내로 입력해주세요'),
  username: z
    .string()
    .min(3, '3자 이상 입력해주세요')
    .max(20, '20자 이내로 입력해주세요')
    .regex(/^[a-z0-9_]+$/, '영소문자, 숫자, 밑줄(_)만 사용 가능합니다'),
});

type ProfileFormValues = z.infer<typeof ProfileSchema>;

export function ProfileForm() {
  const { user } = useMe();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { displayName: '', username: '' },
  });

  useEffect(() => {
    if (user) {
      reset({ displayName: user.displayName, username: user.username });
    }
  }, [user, reset]);

  function onSubmit(data: ProfileFormValues) {
    updateProfile(data, {
      onSuccess: () => {
        toast.success('프로필이 저장되었습니다.');
        reset(data);
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : '저장에 실패했습니다.';
        toast.error(message);
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-text">기본 정보</h2>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-4">
          <Input
            label="표시 이름"
            placeholder="홍길동"
            error={errors.displayName?.message}
            {...register('displayName')}
          />
          <Input
            label="사용자명"
            placeholder="my_username"
            helperText="영소문자, 숫자, 밑줄(_)만 사용 가능"
            error={errors.username?.message}
            {...register('username')}
          />
          {user?.email && (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">이메일</span>
              <p className="text-sm text-text-muted">{user.email}</p>
              <p className="text-xs text-text-muted">이메일 변경은 보안 설정에서 가능합니다.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" isLoading={isPending} disabled={!isDirty || isPending}>
            저장
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
