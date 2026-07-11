'use client';

import { useSessions, useRevokeSession, useRevokeOtherSessions } from '../hooks/use-sessions';
import { Button, Card, CardContent, CardHeader, Spinner, useToast } from '@weaver2/ui';

function parseUserAgent(ua: string | null): string {
  if (!ua) return '알 수 없는 기기';

  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS 기기';
  if (/Android/.test(ua)) return 'Android 기기';

  let browser = '알 수 없는 브라우저';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  let os = '';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  return os ? `${browser} (${os})` : browser;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SessionList() {
  const { data: sessions = [], isLoading } = useSessions();
  const { mutate: revokeSession, isPending: isRevoking } = useRevokeSession();
  const { mutate: revokeOthers, isPending: isRevokingOthers } = useRevokeOtherSessions();
  const toast = useToast();

  const hasOtherSessions = sessions.some((s) => !s.isCurrent);

  function handleRevoke(sessionId: string) {
    revokeSession(sessionId, {
      onSuccess: () => toast.success('세션이 종료되었습니다.'),
      onError: () => toast.error('세션 종료에 실패했습니다.'),
    });
  }

  function handleRevokeOthers() {
    revokeOthers(undefined, {
      onSuccess: () => toast.success('다른 모든 세션이 종료되었습니다.'),
      onError: () => toast.error('세션 종료에 실패했습니다.'),
    });
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between py-3">
        <h2 className="text-base font-semibold text-text">로그인 세션</h2>
        {hasOtherSessions && (
          <Button
            variant="danger"
            size="sm"
            isLoading={isRevokingOthers}
            onClick={handleRevokeOthers}
          >
            다른 세션 모두 종료
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : !sessions?.length ? (
          <p className="px-6 py-4 text-sm text-text-muted">세션 정보를 불러올 수 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-start gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text">
                      {parseUserAgent(session.userAgent)}
                    </p>
                    {session.isCurrent && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        현재 세션
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {session.ipAddress ?? 'IP 없음'} · {formatDate(session.createdAt)}
                  </p>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={isRevoking}
                    onClick={() => handleRevoke(session.id)}
                  >
                    종료
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
