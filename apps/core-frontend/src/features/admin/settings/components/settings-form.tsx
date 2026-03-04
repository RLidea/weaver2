'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Spinner } from '@/shared/components/ui/spinner';
import { useAdminSettings } from '../hooks/use-admin-settings';
import { useUpdateAdminSettings, useResetAdminSettings } from '../hooks/use-admin-settings-mutations';
import type { SystemSettings } from '../types';

// ─── 탭 정의 ────────────────────────────────────────────────────
type TabId = 'site' | 'features' | 'content' | 'upload';

const TABS: { id: TabId; label: string }[] = [
  { id: 'site', label: '사이트' },
  { id: 'features', label: '기능' },
  { id: 'content', label: '콘텐츠·반응' },
  { id: 'upload', label: '업로드' },
];

// ─── 탭 컴포넌트 (key prop으로 리마운트 시 초기화) ────────────────
function SiteTab({
  data,
  onSave,
  isPending,
}: {
  data: SystemSettings;
  onSave: (values: Partial<SystemSettings>) => void;
  isPending: boolean;
}) {
  const [siteName, setSiteName] = useState(data.siteName);
  const [siteDescription, setSiteDescription] = useState(data.siteDescription);
  const [logoUrl, setLogoUrl] = useState(data.logoUrl ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      siteName: siteName.trim(),
      siteDescription: siteDescription.trim(),
      logoUrl: logoUrl.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="사이트명"
        value={siteName}
        onChange={(e) => setSiteName(e.target.value)}
        required
        helperText="브라우저 탭과 메타 태그에 표시됩니다."
      />
      <Input
        label="사이트 설명"
        value={siteDescription}
        onChange={(e) => setSiteDescription(e.target.value)}
        helperText="메타 description에 사용됩니다."
      />
      <Input
        label="로고 URL"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        placeholder="https://example.com/logo.png"
        helperText="비워두면 텍스트 로고를 사용합니다."
      />
      <div className="flex justify-end">
        <Button type="submit" isLoading={isPending}>
          저장
        </Button>
      </div>
    </form>
  );
}

function FeaturesTab({
  data,
  onSave,
  isPending,
}: {
  data: SystemSettings;
  onSave: (values: Partial<SystemSettings>) => void;
  isPending: boolean;
}) {
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(data.isRegistrationOpen);
  const [isAnnouncementActive, setIsAnnouncementActive] = useState(data.isAnnouncementActive);
  const [announcementMessage, setAnnouncementMessage] = useState(data.announcementMessage ?? '');
  const [announcementType, setAnnouncementType] = useState(data.announcementType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      isRegistrationOpen,
      isAnnouncementActive,
      announcementMessage: announcementMessage.trim() || null,
      announcementType,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 회원가입 */}
      <div className="rounded-lg border border-border bg-surface-2 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text">회원가입 허용</p>
            <p className="text-xs text-text-muted">비활성화하면 신규 가입이 차단됩니다.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isRegistrationOpen}
            onClick={() => setIsRegistrationOpen((v) => !v)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              isRegistrationOpen ? 'bg-primary' : 'bg-border',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                isRegistrationOpen ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </div>

      {/* 공지 배너 */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text">공지 배너 활성화</p>
            <p className="text-xs text-text-muted">사이트 상단에 공지 배너를 표시합니다.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isAnnouncementActive}
            onClick={() => setIsAnnouncementActive((v) => !v)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              isAnnouncementActive ? 'bg-primary' : 'bg-border',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                isAnnouncementActive ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>

        {isAnnouncementActive && (
          <>
            <Select
              label="배너 유형"
              id="announcement-type"
              value={announcementType}
              onChange={(e) => setAnnouncementType(e.target.value)}
              options={[
                { value: 'info', label: '정보 (파란색)' },
                { value: 'warning', label: '경고 (노란색)' },
                { value: 'error', label: '위험 (빨간색)' },
                { value: 'success', label: '성공 (초록색)' },
              ]}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">배너 메시지</label>
              <textarea
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                rows={3}
                placeholder="공지 내용을 입력하세요."
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isPending}>
          저장
        </Button>
      </div>
    </form>
  );
}

function ContentTab({
  data,
  onSave,
  isPending,
}: {
  data: SystemSettings;
  onSave: (values: Partial<SystemSettings>) => void;
  isPending: boolean;
}) {
  const [contentPurgeRetentionDays, setContentPurgeRetentionDays] = useState(
    data.contentPurgeRetentionDays?.toString() ?? '',
  );
  const [contentPurgeScheduleHour, setContentPurgeScheduleHour] = useState(
    data.contentPurgeScheduleHour.toString(),
  );
  const [reactionMaxPerUserPerPost, setReactionMaxPerUserPerPost] = useState(
    data.reactionMaxPerUserPerPost.toString(),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const retentionDays = contentPurgeRetentionDays.trim();
    onSave({
      contentPurgeRetentionDays: retentionDays ? parseInt(retentionDays, 10) : null,
      contentPurgeScheduleHour: parseInt(contentPurgeScheduleHour, 10),
      reactionMaxPerUserPerPost: parseInt(reactionMaxPerUserPerPost, 10),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">콘텐츠 정리</p>
      <Input
        label="삭제 콘텐츠 보존 기간 (일)"
        type="number"
        min={1}
        value={contentPurgeRetentionDays}
        onChange={(e) => setContentPurgeRetentionDays(e.target.value)}
        placeholder="비워두면 자동 정리하지 않음"
        helperText="소프트 삭제된 콘텐츠를 지정일 후 영구 삭제합니다."
      />
      <div className="flex flex-col gap-1">
        <Select
          label="정리 스케줄 (시)"
          id="purge-schedule-hour"
          value={contentPurgeScheduleHour}
          onChange={(e) => setContentPurgeScheduleHour(e.target.value)}
          options={Array.from({ length: 24 }, (_, i) => ({
            value: String(i),
            label: `${String(i).padStart(2, '0')}:00`,
          }))}
        />
        <p className="text-xs text-text-muted">매일 해당 시각에 정리 작업을 실행합니다.</p>
      </div>

      <hr className="border-border" />

      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">반응</p>
      <Input
        label="게시글당 최대 반응 수 (사용자별)"
        type="number"
        min={1}
        value={reactionMaxPerUserPerPost}
        onChange={(e) => setReactionMaxPerUserPerPost(e.target.value)}
        required
        helperText="한 사용자가 하나의 게시글에 남길 수 있는 최대 이모지 수입니다."
      />

      <div className="flex justify-end">
        <Button type="submit" isLoading={isPending}>
          저장
        </Button>
      </div>
    </form>
  );
}

function UploadTab({
  data,
  onSave,
  isPending,
}: {
  data: SystemSettings;
  onSave: (values: Partial<SystemSettings>) => void;
  isPending: boolean;
}) {
  const [uploadMaxFileCount, setUploadMaxFileCount] = useState(
    data.uploadMaxFileCount.toString(),
  );
  const [uploadMaxFileSizeMb, setUploadMaxFileSizeMb] = useState(
    (data.uploadMaxFileSize / 1024 / 1024).toString(),
  );
  const [uploadAllowedMimeTypes, setUploadAllowedMimeTypes] = useState(
    data.uploadAllowedMimeTypes.join(', '),
  );
  const [uploadThumbnailWidth, setUploadThumbnailWidth] = useState(
    data.uploadThumbnailWidth.toString(),
  );
  const [uploadThumbnailHeight, setUploadThumbnailHeight] = useState(
    data.uploadThumbnailHeight.toString(),
  );
  const [uploadOrphanRetentionHours, setUploadOrphanRetentionHours] = useState(
    data.uploadOrphanRetentionHours?.toString() ?? '',
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const orphanHours = uploadOrphanRetentionHours.trim();
    const mimeTypes = uploadAllowedMimeTypes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      uploadMaxFileCount: parseInt(uploadMaxFileCount, 10),
      uploadMaxFileSize: Math.round(parseFloat(uploadMaxFileSizeMb) * 1024 * 1024),
      uploadAllowedMimeTypes: mimeTypes,
      uploadThumbnailWidth: parseInt(uploadThumbnailWidth, 10),
      uploadThumbnailHeight: parseInt(uploadThumbnailHeight, 10),
      uploadOrphanRetentionHours: orphanHours ? parseInt(orphanHours, 10) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="최대 파일 수"
          type="number"
          min={1}
          value={uploadMaxFileCount}
          onChange={(e) => setUploadMaxFileCount(e.target.value)}
          required
          helperText="한 번 업로드 시 최대 파일 개수"
        />
        <Input
          label="최대 파일 크기 (MB)"
          type="number"
          min={0.1}
          step={0.1}
          value={uploadMaxFileSizeMb}
          onChange={(e) => setUploadMaxFileSizeMb(e.target.value)}
          required
          helperText="파일 1개의 최대 크기"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text">허용 MIME 타입</label>
        <textarea
          value={uploadAllowedMimeTypes}
          onChange={(e) => setUploadAllowedMimeTypes(e.target.value)}
          rows={3}
          placeholder="image/jpeg, image/png, application/pdf"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <p className="text-xs text-text-muted">쉼표(,)로 구분하여 입력하세요.</p>
      </div>

      <hr className="border-border" />

      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">썸네일</p>
      <div className="grid grid-cols-2 gap-5">
        <Input
          label="썸네일 너비 (px)"
          type="number"
          min={1}
          value={uploadThumbnailWidth}
          onChange={(e) => setUploadThumbnailWidth(e.target.value)}
          required
        />
        <Input
          label="썸네일 높이 (px)"
          type="number"
          min={1}
          value={uploadThumbnailHeight}
          onChange={(e) => setUploadThumbnailHeight(e.target.value)}
          required
        />
      </div>

      <hr className="border-border" />

      <Input
        label="고아 파일 보존 시간 (시)"
        type="number"
        min={1}
        value={uploadOrphanRetentionHours}
        onChange={(e) => setUploadOrphanRetentionHours(e.target.value)}
        placeholder="비워두면 자동 삭제하지 않음"
        helperText="게시글에 첨부되지 않은 파일을 지정 시간 후 삭제합니다."
      />

      <div className="flex justify-end">
        <Button type="submit" isLoading={isPending}>
          저장
        </Button>
      </div>
    </form>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
export function SettingsForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = (searchParams.get('tab') as TabId) ?? 'site';
  const setTab = (id: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', id);
    router.replace(`?${params.toString()}`);
  };

  const { data, isLoading, isError } = useAdminSettings();
  const { mutate: updateSettings, isPending: isUpdating } = useUpdateAdminSettings();

  // 저장 성공 후 탭 컴포넌트를 리마운트해 최신 서버 데이터로 폼 상태를 초기화
  const [revision, setRevision] = useState(0);

  const [resetConfirm, setResetConfirm] = useState(false);
  const { mutate: resetSettings, isPending: isResetting } = useResetAdminSettings();

  const handleSave = (values: Partial<SystemSettings>) => {
    updateSettings(values, { onSuccess: () => setRevision((r) => r + 1) });
  };

  const handleReset = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    resetSettings(undefined, {
      onSuccess: () => {
        setResetConfirm(false);
        setRevision((r) => r + 1);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="py-24 text-center text-sm text-error">설정을 불러오는 데 실패했습니다.</p>
    );
  }

  return (
    <div className="space-y-6">
      {/* 탭 헤더 */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === id
                ? 'border-b-2 border-primary text-primary'
                : 'text-text-muted hover:text-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="rounded-lg border border-border bg-surface p-6">
        {activeTab === 'site' && (
          <SiteTab key={revision} data={data} onSave={handleSave} isPending={isUpdating} />
        )}
        {activeTab === 'features' && (
          <FeaturesTab key={revision} data={data} onSave={handleSave} isPending={isUpdating} />
        )}
        {activeTab === 'content' && (
          <ContentTab key={revision} data={data} onSave={handleSave} isPending={isUpdating} />
        )}
        {activeTab === 'upload' && (
          <UploadTab key={revision} data={data} onSave={handleSave} isPending={isUpdating} />
        )}
      </div>

      {/* 기본값 초기화 */}
      <div className="rounded-lg border border-error/30 bg-error/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text">기본값으로 초기화</p>
            <p className="text-xs text-text-muted">
              모든 설정을 초기 기본값으로 되돌립니다. 이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {resetConfirm && (
              <Button variant="secondary" size="sm" onClick={() => setResetConfirm(false)}>
                취소
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={handleReset}
              isLoading={isResetting}
            >
              {resetConfirm ? '정말 초기화' : '초기화'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
