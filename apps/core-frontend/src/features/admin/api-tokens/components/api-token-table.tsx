'use client';

import { useState } from 'react';
import { Badge, Button, DataTable, Select, Spinner, useUrlState, type DataTableColumn } from '@weaver2/ui';
import { useAdminApiTokens } from '../hooks/use-admin-api-tokens';
import { ApiTokenCreateModal } from './api-token-create-modal';
import { ApiTokenIssuedModal } from './api-token-issued-modal';
import { ApiTokenRevokeDialog } from './api-token-revoke-dialog';
import type { ApiToken, ApiTokenStatus, IssuedApiToken } from '../types';

type StatusFilter = 'live' | 'all';

const STATUS_FILTER_OPTIONS = [
  { value: 'live', label: '살아 있는 것만' },
  { value: 'all', label: '끊긴 · 만료된 것까지' },
];

const STATUS_BADGE: Record<ApiTokenStatus, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  active: { label: '사용 중', variant: 'success' },
  expired: { label: '만료', variant: 'warning' },
  revoked: { label: '끊김', variant: 'default' },
};

function statusOf(token: ApiToken): ApiTokenStatus {
  if (token.revokedAt) return 'revoked';
  if (token.expiresAt && new Date(token.expiresAt).getTime() <= Date.now()) return 'expired';
  return 'active';
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export function ApiTokenTable() {
  const { data, isLoading, isError } = useAdminApiTokens();
  const [params, setParams] = useUrlState({
    status: { default: 'live' as StatusFilter },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [issued, setIssued] = useState<IssuedApiToken | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiToken | null>(null);

  const rows = (data ?? []).filter(
    (token) => params.status === 'all' || statusOf(token) === 'active',
  );

  const columns: DataTableColumn<ApiToken>[] = [
    {
      key: 'name',
      header: '이름',
      cell: (token) => (
        <div>
          <p className="font-medium text-text">{token.name}</p>
          <p className="font-mono text-xs text-text-muted">{token.prefix}_…</p>
        </div>
      ),
    },
    {
      key: 'owner',
      header: '주인',
      cell: (token) => (
        <div>
          <p className="text-text">{token.user.displayName}</p>
          <p className="text-xs text-text-muted">@{token.user.username}</p>
        </div>
      ),
    },
    {
      key: 'scopes',
      header: '범위',
      cell: (token) => (
        <div className="flex flex-wrap gap-1">
          {token.scopes.map((scope) => (
            <code key={scope} className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-text">
              {scope}
            </code>
          ))}
        </div>
      ),
    },
    {
      key: 'lastUsedAt',
      header: '마지막 사용',
      className: 'text-text-muted whitespace-nowrap',
      cell: (token) => formatDate(token.lastUsedAt),
    },
    {
      key: 'expiresAt',
      header: '만료',
      className: 'text-text-muted whitespace-nowrap',
      cell: (token) => (token.expiresAt ? formatDate(token.expiresAt) : '없음'),
    },
    {
      key: 'status',
      header: '상태',
      cell: (token) => {
        const badge = STATUS_BADGE[statusOf(token)];
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: <span className="sr-only">동작</span>,
      cell: (token) =>
        token.revokedAt ? null : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRevokeTarget(token)}
            className="text-error hover:text-error"
          >
            끊기
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-56">
          <Select
            aria-label="상태로 거르기"
            options={STATUS_FILTER_OPTIONS}
            value={params.status}
            onChange={(e) => setParams({ status: e.target.value as StatusFilter })}
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>토큰 발급</Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {isError && (
        <p className="py-16 text-center text-sm text-error">데이터를 불러오는 데 실패했습니다.</p>
      )}

      {data && (
        <DataTable
          columns={columns}
          data={rows}
          keyField="id"
          emptyMessage="발급한 토큰이 없습니다."
        />
      )}

      <ApiTokenCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onIssued={(result) => {
          setCreateOpen(false);
          setIssued(result);
        }}
      />
      <ApiTokenIssuedModal issued={issued} onClose={() => setIssued(null)} />
      <ApiTokenRevokeDialog token={revokeTarget} onClose={() => setRevokeTarget(null)} />
    </div>
  );
}
