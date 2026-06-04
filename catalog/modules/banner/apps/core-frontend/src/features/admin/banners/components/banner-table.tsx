'use client';

import { useState } from 'react';
import { Spinner } from '@/shared/components/ui/spinner';
import { Button } from '@/shared/components/ui/button';
import { useAdminBanners } from '../hooks/use-admin-banners';
import { BannerCreateModal } from './banner-create-modal';
import { BannerEditModal } from './banner-edit-modal';
import { BannerDeleteDialog } from './banner-delete-dialog';
import { BANNER_SLOTS } from '../types';
import type { AdminBanner } from '../types';

function slotLabel(slot: AdminBanner['slot']): string {
  return BANNER_SLOTS.find((s) => s.value === slot)?.label ?? slot;
}

export function BannerTable() {
  const { data, isLoading, isError } = useAdminBanners();

  const [createOpen, setCreateOpen] = useState(false);
  const [editBanner, setEditBanner] = useState<AdminBanner | null>(null);
  const [deleteBanner, setDeleteBanner] = useState<AdminBanner | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>배너 만들기</Button>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {isError && (
          <p className="py-16 text-center text-sm text-error">데이터를 불러오는 데 실패했습니다.</p>
        )}

        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="px-4 py-3 font-medium">제목</th>
                  <th className="px-4 py-3 font-medium">슬롯</th>
                  <th className="px-4 py-3 font-medium">활성</th>
                  <th className="px-4 py-3 font-medium">순서</th>
                  <th className="px-4 py-3 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-muted">
                      배너가 없습니다.
                    </td>
                  </tr>
                )}
                {data.map((banner) => (
                  <tr key={banner.id} className="transition-colors hover:bg-surface-2">
                    <td className="max-w-xs truncate px-4 py-3 font-medium text-text">
                      {banner.title}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{slotLabel(banner.slot)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          banner.isActive
                            ? 'text-success text-xs font-medium'
                            : 'text-text-muted text-xs'
                        }
                      >
                        {banner.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{banner.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditBanner(banner)}>
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteBanner(banner)}
                          className="text-error hover:text-error"
                        >
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BannerCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <BannerEditModal banner={editBanner} onClose={() => setEditBanner(null)} />
      <BannerDeleteDialog banner={deleteBanner} onClose={() => setDeleteBanner(null)} />
    </div>
  );
}
