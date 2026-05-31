import { cn } from '@/shared/lib/cn';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { DependencyChip } from './dependency-chip';
import type { Module, ModuleDependency, ModuleDependent } from '../types';

interface ModuleCardProps {
  module: Module;
  /** 카드 클릭 시 호출 — 그래프 focus 연동용. */
  onSelect?: (id: string) => void;
  /** 현재 선택(focus)된 모듈 ID. 자신과 일치하면 선택 강조. */
  selectedId?: string | null;
}

/** 의존 흐름 한 레인(상류/하류)을 그린다. 빈 경우 placeholder 출력. */
function DependencyLane({
  arrow,
  label,
  hint,
  items,
  emptyText,
}: {
  arrow: string;
  label: string;
  hint: string;
  items: Array<ModuleDependency | ModuleDependent>;
  emptyText: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span aria-hidden="true" className="text-sm leading-none text-text-muted">
          {arrow}
        </span>
        <span className="text-xs font-semibold text-text">{label}</span>
        <span className="text-[0.625rem] text-text-muted">{hint}</span>
      </div>
      {items.length === 0 ? (
        <p className="pl-5 text-xs text-text-muted">{emptyText}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5 pl-5">
          {items.map((item) => (
            <li key={item.id}>
              <DependencyChip id={item.id} kind={item.kind} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ModuleCard({ module, onSelect, selectedId }: ModuleCardProps) {
  const { id, layer, description, dependsOn, dependents, footprint } = module;

  const prismaModelCount = footprint.prismaModels?.length ?? 0;
  const permissionCount = footprint.permissions?.length ?? 0;
  const hasFootprint =
    prismaModelCount > 0 || permissionCount > 0 || Boolean(footprint.backendDir);

  // 위험 요약: 끊기면 컴파일이 깨지는 hard 의존 개수 (상류 기준)
  const hardDependsCount = dependsOn.filter((d) => d.kind === 'hard').length;

  const isSelected = selectedId === id;

  return (
    /**
     * 카드 전체를 클릭 가능하게 버튼으로 래핑한다.
     * onSelect가 없으면 일반 div처럼 동작(pointer-events: auto이나 cursor는 기본).
     * aria-pressed로 선택 상태를 보조 기술에 전달한다.
     */
    <button
      type="button"
      onClick={() => onSelect?.(id)}
      aria-pressed={isSelected}
      aria-label={`${id} 모듈 ${isSelected ? '(선택됨)' : '— 클릭하면 그래프에서 focus'}`}
      className={cn(
        'block w-full text-left',
        onSelect ? 'cursor-pointer' : 'cursor-default',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 rounded-lg',
      )}
    >
    <Card
      glass
      className={cn(
        'flex flex-col transition-shadow duration-200',
        isSelected && 'ring-2 ring-[var(--color-primary)] shadow-[0_0_0_2px_var(--color-primary)]',
      )}
    >
      {/* ── 1. 헤더: 정체성 + 위험 요약 ── */}
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-text">{id}</p>
          {description && (
            <p className="mt-0.5 text-xs text-text-muted">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="default">{layer}</Badge>
          {hardDependsCount > 0 && (
            <Badge variant="error" title="끊기면 컴파일이 깨지는 강한 의존">
              hard {hardDependsCount}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* ── 2. 의존 흐름 (카드의 주인공) ── */}
      <CardContent className="flex-1 space-y-4">
        <DependencyLane
          arrow="⬆"
          label="필요로 함"
          hint="이 모듈이 의존하는 상류"
          items={dependsOn}
          emptyText="의존 없음 (독립 모듈)"
        />
        <DependencyLane
          arrow="⬇"
          label="이 모듈을 사용함"
          hint="이 모듈에 의존하는 하류"
          items={dependents}
          emptyText="사용처 없음 (말단 모듈)"
        />

        {/* hard/soft 범례 — 칩 색의 의미를 카드 안에서 자체 설명 */}
        <div className="flex items-center gap-3 pt-0.5 text-[0.625rem] text-text-muted">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="text-error">
              ●
            </span>
            hard · 강한 결합
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true">○</span>
            soft · 느슨한 결합
          </span>
        </div>
      </CardContent>

      {/* ── 3. Footprint: 아이콘 + 숫자 한 줄로 압축 ── */}
      {hasFootprint && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-6 py-3 text-xs text-text-muted">
          {footprint.backendDir && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <FolderGlyph />
              <span className="truncate font-mono text-text">
                {footprint.backendDir}
              </span>
            </span>
          )}
          {prismaModelCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <DatabaseGlyph />
              <span>
                <span className="font-medium text-text">{prismaModelCount}</span>{' '}
                모델
              </span>
            </span>
          )}
          {permissionCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <KeyGlyph />
              <span>
                <span className="font-medium text-text">{permissionCount}</span>{' '}
                권한
              </span>
            </span>
          )}
        </div>
      )}
    </Card>
    </button>
  );
}

/* ── footprint 압축용 인라인 글리프 (currentColor 상속) ── */

function FolderGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  );
}

function DatabaseGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  );
}

function KeyGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
