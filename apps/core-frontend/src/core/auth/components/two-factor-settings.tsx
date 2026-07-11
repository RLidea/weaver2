'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useTwoFactorStatus,
  useSetupTotp,
  useConfirmTotpSetup,
  useDisableTotp,
  useSetupEmailOtp,
  useConfirmEmailOtp,
  useDisableEmailOtp,
} from '../hooks/use-two-factor';
import { Button, Card, CardContent, CardFooter, CardHeader, Input, Spinner, useToast } from '@weaver2/ui';
import { ApiError } from '@weaver2/api-client';

const CodeSchema = z.object({ code: z.string().min(1, '코드를 입력해주세요') });
type CodeValues = z.infer<typeof CodeSchema>;

/* ── TOTP 섹션 ────────────────────────────────────────────── */

function TotpSection({ enabled }: { enabled: boolean }) {
  const [mode, setMode] = useState<'idle' | 'setup' | 'disable'>('idle');
  const { refetch: fetchSetup, data: setupData, isFetching } = useSetupTotp();
  const { mutate: confirmSetup, isPending: isConfirming } = useConfirmTotpSetup();
  const { mutate: disableTotp, isPending: isDisabling } = useDisableTotp();
  const toast = useToast();

  const confirmForm = useForm<CodeValues>({ resolver: zodResolver(CodeSchema) });
  const disableForm = useForm<CodeValues>({ resolver: zodResolver(CodeSchema) });

  function handleStartSetup() {
    fetchSetup();
    setMode('setup');
  }

  function handleConfirmSetup(data: CodeValues) {
    confirmSetup(data.code, {
      onSuccess: () => {
        toast.success('TOTP 인증이 활성화되었습니다.');
        setMode('idle');
        confirmForm.reset();
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : '활성화에 실패했습니다.';
        toast.error(message);
      },
    });
  }

  function handleDisable(data: CodeValues) {
    disableTotp(data.code, {
      onSuccess: () => {
        toast.success('TOTP 인증이 비활성화되었습니다.');
        setMode('idle');
        disableForm.reset();
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : '비활성화에 실패했습니다.';
        toast.error(message);
      },
    });
  }

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text">인증 앱 (TOTP)</p>
          <p className="text-xs text-text-muted">
            Google Authenticator, Authy 등의 앱으로 6자리 코드를 생성합니다.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${enabled ? 'bg-success/10 text-success' : 'bg-border text-text-muted'}`}
          >
            {enabled ? '활성' : '비활성'}
          </span>
          {enabled ? (
            <Button variant="secondary" size="sm" onClick={() => setMode(mode === 'disable' ? 'idle' : 'disable')}>
              비활성화
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={mode === 'setup' ? () => setMode('idle') : handleStartSetup}>
              {mode === 'setup' ? '취소' : '설정'}
            </Button>
          )}
        </div>
      </div>

      {mode === 'setup' && (
        <div className="mt-4 space-y-4 rounded-md border border-border p-4">
          {isFetching ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : setupData ? (
            <>
              <p className="text-sm text-text-muted">
                아래 QR 코드를 인증 앱으로 스캔하거나, 키를 직접 입력하세요.
              </p>
              <div className="flex justify-center">
                <Image
                  src={setupData.qrCodeUrl}
                  alt="TOTP QR Code"
                  width={160}
                  height={160}
                  className="rounded-md border border-border"
                />
              </div>
              <div className="rounded-md bg-surface-2 px-3 py-2">
                <p className="break-all text-center font-mono text-xs text-text-muted">
                  {setupData.secret}
                </p>
              </div>
              <form onSubmit={confirmForm.handleSubmit(handleConfirmSetup)} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="6자리 코드 입력"
                    error={confirmForm.formState.errors.code?.message}
                    {...confirmForm.register('code')}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData('text').trim().slice(0, 6);
                      confirmForm.setValue('code', text, { shouldValidate: true });
                    }}
                  />
                </div>
                <Button type="submit" size="md" isLoading={isConfirming}>
                  확인
                </Button>
              </form>
            </>
          ) : null}
        </div>
      )}

      {mode === 'disable' && (
        <div className="mt-4 rounded-md border border-border p-4">
          <p className="mb-3 text-sm text-text-muted">
            TOTP를 비활성화하려면 인증 앱의 현재 코드를 입력하세요.
            이메일 OTP가 활성화된 경우에만 비활성화할 수 있습니다.
          </p>
          <form onSubmit={disableForm.handleSubmit(handleDisable)} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="6자리 코드 입력"
                error={disableForm.formState.errors.code?.message}
                {...disableForm.register('code')}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text').trim().slice(0, 6);
                  disableForm.setValue('code', text, { shouldValidate: true });
                }}
              />
            </div>
            <Button type="submit" variant="danger" size="md" isLoading={isDisabling}>
              비활성화
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ── Email OTP 섹션 ──────────────────────────────────────── */

function EmailOtpSection({ enabled }: { enabled: boolean }) {
  const [mode, setMode] = useState<'idle' | 'setup' | 'disable'>('idle');
  const { mutate: setupOtp, isPending: isSending } = useSetupEmailOtp();
  const { mutate: confirmOtp, isPending: isConfirming } = useConfirmEmailOtp();
  const { mutate: disableOtp, isPending: isDisabling } = useDisableEmailOtp();
  const toast = useToast();

  const confirmForm = useForm<CodeValues>({ resolver: zodResolver(CodeSchema) });
  const disableForm = useForm<CodeValues>({ resolver: zodResolver(CodeSchema) });

  function handleStartSetup() {
    setupOtp(undefined, {
      onSuccess: () => {
        toast.info('인증 코드가 이메일로 발송되었습니다.');
        setMode('setup');
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : '발송에 실패했습니다.';
        toast.error(message);
      },
    });
  }

  function handleConfirm(data: CodeValues) {
    confirmOtp(data.code, {
      onSuccess: () => {
        toast.success('이메일 OTP가 활성화되었습니다.');
        setMode('idle');
        confirmForm.reset();
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : '활성화에 실패했습니다.';
        toast.error(message);
      },
    });
  }

  function handleDisable(data: CodeValues) {
    disableOtp(data.code, {
      onSuccess: () => {
        toast.success('이메일 OTP가 비활성화되었습니다.');
        setMode('idle');
        disableForm.reset();
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : '비활성화에 실패했습니다.';
        toast.error(message);
      },
    });
  }

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text">이메일 OTP</p>
          <p className="text-xs text-text-muted">
            로그인 시 등록된 이메일로 인증 코드를 발송합니다.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${enabled ? 'bg-success/10 text-success' : 'bg-border text-text-muted'}`}
          >
            {enabled ? '활성' : '비활성'}
          </span>
          {enabled ? (
            <Button variant="secondary" size="sm" onClick={() => setMode(mode === 'disable' ? 'idle' : 'disable')}>
              비활성화
            </Button>
          ) : (
            <Button variant="secondary" size="sm" isLoading={isSending} onClick={mode === 'setup' ? () => setMode('idle') : handleStartSetup}>
              {mode === 'setup' ? '취소' : '설정'}
            </Button>
          )}
        </div>
      </div>

      {mode === 'setup' && (
        <div className="mt-4 rounded-md border border-border p-4">
          <p className="mb-3 text-sm text-text-muted">
            이메일로 발송된 인증 코드를 입력하세요.
          </p>
          <form onSubmit={confirmForm.handleSubmit(handleConfirm)} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="인증 코드 입력"
                error={confirmForm.formState.errors.code?.message}
                {...confirmForm.register('code')}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text').trim().slice(0, 6);
                  confirmForm.setValue('code', text, { shouldValidate: true });
                }}
              />
            </div>
            <Button type="submit" size="md" isLoading={isConfirming}>
              확인
            </Button>
          </form>
        </div>
      )}

      {mode === 'disable' && (
        <div className="mt-4 rounded-md border border-border p-4">
          <p className="mb-3 text-sm text-text-muted">
            이메일 OTP를 비활성화하려면 인증 앱(TOTP)의 현재 코드를 입력하세요.
            TOTP가 활성화된 경우에만 비활성화할 수 있습니다.
          </p>
          <form onSubmit={disableForm.handleSubmit(handleDisable)} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="인증 코드 입력"
                error={disableForm.formState.errors.code?.message}
                {...disableForm.register('code')}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text').trim().slice(0, 6);
                  disableForm.setValue('code', text, { shouldValidate: true });
                }}
              />
            </div>
            <Button type="submit" variant="danger" size="md" isLoading={isDisabling}>
              비활성화
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ── 통합 컴포넌트 ────────────────────────────────────────── */

export function TwoFactorSettings() {
  const { data: status, isLoading } = useTwoFactorStatus();

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-text">2단계 인증</h2>
      </CardHeader>
      <CardContent className="divide-y divide-border px-6 py-0">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : (
          <>
            <TotpSection enabled={status?.totpEnabled ?? false} />
            <EmailOtpSection enabled={status?.emailOtpEnabled ?? false} />
          </>
        )}
      </CardContent>
      <CardFooter className="pb-4 pt-0">
        <p className="text-xs text-text-muted">
          2단계 인증을 비활성화하려면 다른 인증 수단이 활성화되어 있어야 합니다.
        </p>
      </CardFooter>
    </Card>
  );
}
