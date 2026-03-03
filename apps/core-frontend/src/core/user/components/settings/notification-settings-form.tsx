'use client';

import { useState } from 'react';
import { useUpdateProfile } from '@/core/user/hooks/use-update-profile';
import { useToast } from '@/infrastructure/providers/toast-provider';
import { ApiError } from '@/types/api';
import { Card, CardHeader, CardContent } from '@/shared/components/ui/card';

interface ToggleItemProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleItem({ label, description, checked, onChange, disabled }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-border'}`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

export function NotificationSettingsForm() {
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const toast = useToast();

  const [emailNotification, setEmailNotification] = useState(false);
  const [smsNotification, setSmsNotification] = useState(false);
  const [pushNotification, setPushNotification] = useState(false);

  function handleToggle(
    key: 'emailNotification' | 'smsNotification' | 'pushNotification',
    value: boolean,
    setter: (v: boolean) => void,
  ) {
    setter(value);
    updateProfile(
      { [key]: value },
      {
        onError: (err) => {
          setter(!value); // 롤백
          const message = err instanceof ApiError ? err.message : '저장에 실패했습니다.';
          toast.error(message);
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-text">알림 수신 설정</h2>
      </CardHeader>
      <CardContent className="divide-y divide-border px-6 py-0">
        <ToggleItem
          label="이메일 알림"
          description="주요 활동 알림을 이메일로 수신합니다."
          checked={emailNotification}
          disabled={isPending}
          onChange={(v) => handleToggle('emailNotification', v, setEmailNotification)}
        />
        <ToggleItem
          label="SMS 알림"
          description="중요 알림을 문자 메시지로 수신합니다."
          checked={smsNotification}
          disabled={isPending}
          onChange={(v) => handleToggle('smsNotification', v, setSmsNotification)}
        />
        <ToggleItem
          label="푸시 알림"
          description="브라우저 푸시 알림을 수신합니다."
          checked={pushNotification}
          disabled={isPending}
          onChange={(v) => handleToggle('pushNotification', v, setPushNotification)}
        />
      </CardContent>
    </Card>
  );
}
