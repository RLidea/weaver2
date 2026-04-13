'use client';

import { useOAuthConnections, useDisconnectOAuth } from '../hooks/use-oauth-connections';
import { useToast } from '@/infrastructure/providers/toast-provider';
import { ApiError } from '@/types/api';
import { Card, CardHeader, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  kakao: '카카오',
  naver: '네이버',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ProviderIcon({ provider }: { provider: string }) {
  const label = PROVIDER_LABELS[provider] ?? provider;
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-text-muted">
      {label.charAt(0).toUpperCase()}
    </div>
  );
}

export function OAuthConnections() {
  const { data: connections = [], isLoading } = useOAuthConnections();
  const { mutate: disconnect, isPending } = useDisconnectOAuth();
  const toast = useToast();

  function handleDisconnect(provider: string) {
    if (!confirm(`${PROVIDER_LABELS[provider] ?? provider} 연동을 해제할까요?`)) return;

    disconnect(provider, {
      onSuccess: () => toast.success('소셜 계정 연동이 해제되었습니다.'),
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : '연동 해제에 실패했습니다.';
        toast.error(message);
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-text">소셜 계정 연동</h2>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : connections.length === 0 ? (
          <p className="px-6 py-4 text-sm text-text-muted">
            연결된 소셜 계정이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {connections.map((conn) => (
              <li key={conn.provider} className="flex items-center gap-3 px-6 py-4">
                <ProviderIcon provider={conn.provider} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">
                    {PROVIDER_LABELS[conn.provider] ?? conn.provider}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    연결됨 · {formatDate(conn.createdAt)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isPending}
                  onClick={() => handleDisconnect(conn.provider)}
                >
                  해제
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
