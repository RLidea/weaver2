'use client';

import { useCallback, useState } from 'react';
import { Spinner } from '@/shared/components/ui/spinner';
import { Tabs, type TabItem } from '@/shared/components/ui/tabs';
import { useModules } from '../hooks/use-modules';
import { ModuleStats } from './module-stats';
import { ModuleCard } from './module-card';
import { ModuleGraph } from './module-graph';

type ModuleView = 'graph' | 'cards';

const TAB_ITEMS: TabItem<ModuleView>[] = [
  { id: 'graph', label: '그래프' },
  { id: 'cards', label: '카드' },
];

/**
 * 모듈 레지스트리 대시보드.
 *
 * 그래프(의존 관계 시각화)와 카드(상세 목록) 두 뷰를 탭으로 전환한다.
 * 기본 탭은 그래프 — 전체 의존 구조를 한눈에 보여준다.
 *
 * Focus 연동:
 *   - selectedId: 그래프 노드 클릭 또는 카드 클릭으로 설정됨.
 *   - 카드 클릭 → selectedId 설정 + 그래프 탭으로 자동 전환.
 *   - 그래프 pane 클릭 / 재클릭 → selectedId = null (전체 복귀).
 *   - 탭 수동 전환 시 selectedId는 유지 (돌아왔을 때 동일 focus 복원).
 */
export function ModuleDashboard() {
  const [view, setView] = useState<ModuleView>('graph');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError } = useModules();

  /**
   * 카드 클릭 핸들러 — 그래프 탭으로 전환 후 해당 모듈 focus.
   * 이미 선택된 카드를 다시 클릭하면 선택만 해제 (탭 전환 없음).
   */
  const handleCardSelect = useCallback(
    (id: string) => {
      if (selectedId === id) {
        setSelectedId(null);
      } else {
        setSelectedId(id);
        setView('graph');
      }
    },
    [selectedId],
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm font-semibold text-text">데이터를 불러오지 못했습니다.</p>
        <p className="mt-1 text-xs text-text-muted">잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleStats stats={data.stats} />

      <Tabs items={TAB_ITEMS} activeId={view} onChange={setView} />

      {view === 'graph' ? (
        <ModuleGraph
          modules={data.modules}
          edges={data.edges}
          selectedId={selectedId}
          onSelectedChange={setSelectedId}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              selectedId={selectedId}
              onSelect={handleCardSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
