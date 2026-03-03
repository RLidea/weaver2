'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import type { AdminUsersParams, UserStatusFilter } from '../types';

interface UserTableFiltersProps {
  params: AdminUsersParams;
  onChange: (updates: Partial<AdminUsersParams>) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'active', label: '활성' },
  { value: 'suspended', label: '정지' },
  { value: 'deleted', label: '삭제됨' },
];

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: '가입일 (최신순)' },
  { value: 'createdAt:asc', label: '가입일 (오래된순)' },
  { value: 'displayName:asc', label: '이름 (가나다순)' },
  { value: 'displayName:desc', label: '이름 (역순)' },
];

export function UserTableFilters({ params, onChange }: UserTableFiltersProps) {
  const [search, setSearch] = useState(params.search ?? '');

  // 검색 debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (params.search ?? '')) {
        onChange({ search: search || undefined, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <Input
          placeholder="이름, 사용자명, 이메일 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="w-36">
        <Select
          options={STATUS_OPTIONS}
          value={params.status ?? 'all'}
          onChange={(e) => onChange({ status: e.target.value as UserStatusFilter, page: 1 })}
        />
      </div>
      <div className="w-48">
        <Select
          options={SORT_OPTIONS}
          value={params.sort ?? 'createdAt:desc'}
          onChange={(e) => onChange({ sort: e.target.value, page: 1 })}
        />
      </div>
    </div>
  );
}
