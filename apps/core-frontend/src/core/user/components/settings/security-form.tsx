'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useChangePassword } from '@/core/user/hooks/use-change-password';
import {
  useRequestEmailChange,
  useConfirmEmailChange,
} from '@/core/user/hooks/use-email-change';
import { Button, Card, CardContent, CardFooter, CardHeader, Input, useToast } from '@weaver2/ui';
import { ApiError } from '@/types/api';

/* ── 비밀번호 변경 ───────────────────────────────────────── */

const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
    newPassword: z.string().min(8, '8자 이상 입력해주세요'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof PasswordSchema>;

function ChangePasswordForm() {
  const { mutate: changePassword, isPending } = useChangePassword();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(PasswordSchema) });

  function onSubmit(data: PasswordFormValues) {
    changePassword(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      {
        onSuccess: () => {
          toast.success('비밀번호가 변경되었습니다.');
          reset();
        },
        onError: (err) => {
          const message = err instanceof ApiError ? err.message : '변경에 실패했습니다.';
          toast.error(message);
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-text">비밀번호 변경</h2>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-4">
          <Input
            label="현재 비밀번호"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <Input
            label="새 비밀번호"
            type="password"
            autoComplete="new-password"
            helperText="8자 이상"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Input
            label="새 비밀번호 확인"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" isLoading={isPending} disabled={isPending}>
            변경
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

/* ── 이메일 변경 ─────────────────────────────────────────── */

const EmailRequestSchema = z.object({
  currentPassword: z.string().min(1, '비밀번호를 입력해주세요'),
  newEmail: z.string().email('올바른 이메일 형식이 아닙니다'),
});

const EmailConfirmSchema = z.object({
  code: z.string().min(1, '인증 코드를 입력해주세요'),
});

type EmailRequestValues = z.infer<typeof EmailRequestSchema>;
type EmailConfirmValues = z.infer<typeof EmailConfirmSchema>;

function ChangeEmailForm() {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const { mutate: requestChange, isPending: isRequesting } = useRequestEmailChange();
  const { mutate: confirmChange, isPending: isConfirming } = useConfirmEmailChange();
  const toast = useToast();

  const requestForm = useForm<EmailRequestValues>({ resolver: zodResolver(EmailRequestSchema) });
  const confirmForm = useForm<EmailConfirmValues>({ resolver: zodResolver(EmailConfirmSchema) });

  function onRequest(data: EmailRequestValues) {
    requestChange(data, {
      onSuccess: () => {
        toast.info('인증 코드가 새 이메일 주소로 발송되었습니다.');
        setStep('confirm');
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : '요청에 실패했습니다.';
        toast.error(message);
      },
    });
  }

  function onConfirm(data: EmailConfirmValues) {
    confirmChange(data, {
      onSuccess: () => {
        toast.success('이메일이 변경되었습니다.');
        setStep('request');
        requestForm.reset();
        confirmForm.reset();
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : '인증에 실패했습니다.';
        toast.error(message);
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-text">이메일 변경</h2>
      </CardHeader>

      {step === 'request' ? (
        <form onSubmit={requestForm.handleSubmit(onRequest)}>
          <CardContent className="flex flex-col gap-4">
            <Input
              label="현재 비밀번호"
              type="password"
              autoComplete="current-password"
              error={requestForm.formState.errors.currentPassword?.message}
              {...requestForm.register('currentPassword')}
            />
            <Input
              label="새 이메일"
              type="email"
              autoComplete="email"
              error={requestForm.formState.errors.newEmail?.message}
              {...requestForm.register('newEmail')}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" isLoading={isRequesting} disabled={isRequesting}>
              인증 코드 발송
            </Button>
          </CardFooter>
        </form>
      ) : (
        <form onSubmit={confirmForm.handleSubmit(onConfirm)}>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              새 이메일로 발송된 인증 코드를 입력해주세요.
            </p>
            <Input
              label="인증 코드"
              type="text"
              autoComplete="one-time-code"
              error={confirmForm.formState.errors.code?.message}
              {...confirmForm.register('code')}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep('request')}
            >
              다시 시도
            </Button>
            <Button type="submit" isLoading={isConfirming} disabled={isConfirming}>
              확인
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}

/* ── 통합 내보내기 ────────────────────────────────────────── */

import { SessionList } from '@/core/auth/components/session-list';
import { TwoFactorSettings } from '@/core/auth/components/two-factor-settings';
import { OAuthConnections } from '@/core/auth/components/oauth-connections';

export function SecurityForm() {
  return (
    <div className="space-y-6">
      <ChangePasswordForm />
      <ChangeEmailForm />
      <TwoFactorSettings />
      <OAuthConnections />
      <SessionList />
    </div>
  );
}
