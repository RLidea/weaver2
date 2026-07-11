'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMe } from '@/core/user/hooks/use-me';
import { useUpdateProfile } from '@/core/user/hooks/use-update-profile';
import { useUploadProfileImage } from '@/core/user/hooks/use-upload-profile-image';
import { Button, Card, CardContent, CardFooter, CardHeader, Input, useToast } from '@weaver2/ui';
import { ApiError } from '@/types/api';

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
  const { mutate: uploadImage, isPending: isUploading } = useUploadProfileImage();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage(file, {
      onSuccess: () => toast.success('프로필 이미지가 변경되었습니다.'),
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : '이미지 업로드에 실패했습니다.';
        toast.error(message);
      },
    });
    e.target.value = '';
  }

  const initials = (user?.displayName ?? user?.username ?? '?').charAt(0).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-text">기본 정보</h2>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-4">
          {/* 프로필 이미지 */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary transition-opacity hover:opacity-80 disabled:opacity-50"
              aria-label="프로필 이미지 변경"
            >
              {user?.profileImageUrl ? (
                <Image
                  src={user.profileImageUrl}
                  alt="프로필 이미지"
                  fill
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl font-bold text-primary-fg">
                  {initials}
                </span>
              )}
            </button>
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                isLoading={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                이미지 변경
              </Button>
              <p className="mt-1 text-xs text-text-muted">JPG, PNG, GIF, WEBP · 최대 5MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

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
