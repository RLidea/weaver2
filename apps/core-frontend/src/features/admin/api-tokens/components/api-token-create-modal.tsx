'use client';

import { useState } from 'react';
import { API_TOKEN_SCOPES } from '@weaver2/shared';
import { Button, Input, Modal, Select, cn } from '@weaver2/ui';
import { useAdminUsers } from '@/features/admin/users/hooks/use-admin-users';
import type { AdminUser } from '@/features/admin/users/types';
import { useIssueApiToken } from '../hooks/use-admin-api-token-mutations';
import type { IssuedApiToken } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onIssued: (issued: IssuedApiToken) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const EXPIRY_OPTIONS = [
  { value: '30', label: '30일' },
  { value: '90', label: '90일' },
  { value: '365', label: '1년' },
  { value: 'none', label: '만료 없음 (끊을 때까지)' },
];

/** 서버와 같은 형식 — 소문자 · 숫자를 `:` `.` `_` `-` 로 잇는다 */
const SCOPE_PATTERN = /^[a-z0-9]+([:._-][a-z0-9]+)*$/;

/** 고른 만료(일 수 · 'none')를 지금부터의 시각으로 */
function expiresAtFrom(expiry: string): string | undefined {
  return expiry === 'none' ? undefined : new Date(Date.now() + Number(expiry) * DAY_MS).toISOString();
}

function parseScopes(text: string): string[] {
  return [...new Set(text.split(/[\s,]+/).filter(Boolean))];
}

export function ApiTokenCreateModal({ open, onClose, onIssued }: Props) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState<Pick<AdminUser, 'id' | 'username' | 'displayName'> | null>(null);
  const [search, setSearch] = useState('');
  const [scopeText, setScopeText] = useState('');
  const [expiry, setExpiry] = useState('90');
  const { mutate, isPending } = useIssueApiToken();

  const { data: searchResult } = useAdminUsers(
    !owner && search.trim().length >= 2
      ? { search: search.trim(), limit: 10, status: 'active' }
      : undefined,
  );

  const scopes = parseScopes(scopeText);
  const invalidScopes = scopes.filter((scope) => !SCOPE_PATTERN.test(scope));
  const canSubmit = !!name.trim() && !!owner && scopes.length > 0 && invalidScopes.length === 0;

  const toggleScope = (scope: string) => {
    setScopeText(
      (scopes.includes(scope) ? scopes.filter((s) => s !== scope) : [...scopes, scope]).join(' '),
    );
  };

  const handleClose = () => {
    setName('');
    setOwner(null);
    setSearch('');
    setScopeText('');
    setExpiry('90');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    mutate(
      {
        userId: owner.id,
        name: name.trim(),
        scopes,
        expiresAt: expiresAtFrom(expiry),
      },
      {
        onSuccess: (res) => {
          handleClose();
          onIssued(res.data);
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={handleClose} title="API 토큰 발급" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="이름"
          placeholder="예: 초안 넣기 봇"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          autoFocus
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-text">주인</p>
          {owner ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-text">{owner.displayName}</p>
                <p className="text-xs text-text-muted">@{owner.username}</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOwner(null)}>
                바꾸기
              </Button>
            </div>
          ) : (
            <>
              <Input
                aria-label="주인 검색"
                placeholder="사용자 이름 또는 이메일로 검색 (2자 이상)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                helperText="토큰으로 한 일은 이 사용자가 한 일로 남습니다. 권한은 따라가지 않습니다."
              />
              {searchResult && searchResult.data.length > 0 && (
                <ul className="max-h-48 overflow-y-auto rounded-md border border-border bg-surface-2">
                  {searchResult.data.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => setOwner(user)}
                        className="w-full px-3 py-2 text-left transition-colors hover:bg-surface"
                      >
                        <span className="block text-sm font-medium text-text">{user.displayName}</span>
                        <span className="block text-xs text-text-muted">@{user.username}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {searchResult && searchResult.data.length === 0 && search.trim().length >= 2 && (
                <p className="py-2 text-center text-sm text-text-muted">검색 결과가 없습니다.</p>
              )}
            </>
          )}
        </div>

        <div className="space-y-2">
          <Input
            label="범위"
            placeholder="예: blog:draft"
            value={scopeText}
            onChange={(e) => setScopeText(e.target.value)}
            error={invalidScopes.length > 0 ? `형식이 어긋난 범위: ${invalidScopes.join(', ')}` : undefined}
            helperText="띄어쓰기나 쉼표로 여럿을 적습니다. 경로의 @ApiTokenScope 이름과 같아야 통합니다."
          />
          {API_TOKEN_SCOPES.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="등록된 범위">
              {API_TOKEN_SCOPES.map((option) => {
                const selected = scopes.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleScope(option.value)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      selected
                        ? 'border-primary bg-primary text-primary-fg'
                        : 'border-border bg-surface-2 text-text hover:bg-surface',
                    )}
                  >
                    {option.label} <code className="opacity-70">{option.value}</code>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Select
          label="만료"
          options={EXPIRY_OPTIONS}
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            취소
          </Button>
          <Button type="submit" disabled={!canSubmit} isLoading={isPending}>
            발급
          </Button>
        </div>
      </form>
    </Modal>
  );
}
