'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { cn } from '@/shared/lib/cn';
import type { Module, ModuleEdge, ModuleLayer } from '../types';
import { layoutModuleGraph, type LaidOutNode } from './module-graph-layout';

interface ModuleGraphProps {
  modules: Module[];
  edges: ModuleEdge[];
  /** 현재 focus된 모듈 ID (controlled). null = 전체 표시. */
  selectedId?: string | null;
  /** 선택 상태 변경 콜백 — null 전달 시 선택 해제. */
  onSelectedChange?: (id: string | null) => void;
}

/**
 * 커스텀 노드가 받는 데이터.
 * focusState는 노드 렌더링 시 강조/dim/선택 시각 상태를 결정한다.
 */
interface ModuleNodeData extends Record<string, unknown> {
  layer: ModuleLayer;
  description: string;
  isSynthetic: boolean;
  /** focus 모드에서의 시각 상태. undefined = focus 모드 비활성(전체 표시). */
  focusState?: 'selected' | 'neighbor' | 'dimmed';
}

type ModuleFlowNode = Node<ModuleNodeData, 'module'>;

/**
 * layer별 좌측 액센트 바 색.
 * 모두 semantic 토큰만 사용 — 하드코딩 hex 없음.
 *   features → primary (제품 기능), system → text(중립 강조),
 *   infrastructure → success, core → muted(외부/기반).
 */
const LAYER_ACCENT: Record<ModuleLayer, string> = {
  features: 'bg-primary',
  system: 'bg-text',
  infrastructure: 'bg-success',
  core: 'bg-text-muted',
};

/**
 * 모듈 노드 — 카드/칩과 동일한 글래스 + semantic 토큰 디자인 언어.
 * synthetic(매니페스트 없는 core 의존)은 점선 테두리 + 반투명으로 옅게 그린다.
 *
 * Focus 모드:
 *   selected  → ring-2 ring-primary + 정상 불투명도 (선택 노드 강조)
 *   neighbor  → 정상 (1-hop 이웃, 관련 노드)
 *   dimmed    → opacity 0.2 (비관련 노드)
 *   undefined → 전체 정상 표시 (focus 비활성)
 *
 * transition-opacity로 dim 전환을 부드럽게 처리한다.
 */
function ModuleNode({ data, id }: NodeProps<ModuleFlowNode>) {
  const { layer, description, isSynthetic, focusState } = data;

  const isSelected = focusState === 'selected';
  const isDimmed = focusState === 'dimmed';

  return (
    <div
      aria-current={isSelected ? 'true' : undefined}
      style={{ opacity: isDimmed ? 0.2 : 1 }}
      className={cn(
        'w-[200px] overflow-hidden rounded-lg border shadow-[var(--shadow-card)] backdrop-blur-[var(--blur-backdrop)]',
        'transition-opacity duration-300',
        isSynthetic
          ? 'border-dashed border-border bg-surface-2/60 opacity-70'
          : 'border-border bg-surface/85',
        // 선택 노드: ring + primary 테두리로 강조. dim 상태가 아닐 때만 적용.
        isSelected && !isSynthetic && 'ring-2 ring-[var(--color-primary)] border-[var(--color-primary)]',
      )}
    >
      {/* 선택 노드 상단 강조 바 (primary 토큰, 시각적 포인트) */}
      {isSelected && (
        <div
          aria-hidden="true"
          className="h-0.5 w-full bg-primary"
        />
      )}
      {/* 상류로 들어오는/하류로 나가는 핸들 (세로 흐름). 시각적으로는 숨김. */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-1 !w-1 !border-0 !bg-transparent"
      />
      <div className="flex items-stretch">
        <span
          aria-hidden="true"
          className={cn('w-1 shrink-0', LAYER_ACCENT[layer])}
        />
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-text">{id}</span>
            <span className="shrink-0 rounded-full border border-border bg-surface-2 px-1.5 py-0.5 text-[0.625rem] font-medium text-text-muted">
              {layer}
            </span>
          </div>
          {description ? (
            <p className="mt-1 line-clamp-2 text-[0.6875rem] leading-tight text-text-muted">
              {description}
            </p>
          ) : isSynthetic ? (
            <p className="mt-1 text-[0.6875rem] italic leading-tight text-text-muted">
              코어 의존 (매니페스트 없음)
            </p>
          ) : null}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-1 !w-1 !border-0 !bg-transparent"
      />
    </div>
  );
}

const nodeTypes = { module: ModuleNode };

function toFlowNodes(laidOut: LaidOutNode[]): ModuleFlowNode[] {
  return laidOut.map((n) => ({
    id: n.id,
    type: 'module',
    position: n.position,
    data: {
      layer: n.layer,
      description: n.description,
      isSynthetic: n.isSynthetic,
      focusState: undefined,
    },
    draggable: true,
    selectable: true,
    connectable: false,
  }));
}

/**
 * 엣지 = 의존(from → to, 화살표는 상류 to를 가리킨다).
 *   - hard: error 토큰 실선·굵게  (칩의 ● 강조와 동일 색 언어)
 *   - soft: muted 토큰 점선·얇게  (칩의 ○ 옅음과 동일)
 * 색은 CSS 변수(skin-reactive)로 참조 — 하드코딩 없음.
 */
function toFlowEdges(edges: ModuleEdge[]): Edge[] {
  return edges.map((e) => {
    const isHard = e.kind === 'hard';
    const color = isHard ? 'var(--color-error)' : 'var(--color-text-muted)';

    return {
      id: `${e.from}->${e.to}->${e.kind}`,
      source: e.from,
      target: e.to,
      type: 'default',
      animated: false,
      style: {
        stroke: color,
        strokeWidth: isHard ? 2 : 1.5,
        strokeDasharray: isHard ? undefined : '5 4',
        opacity: isHard ? 0.85 : 0.6,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color,
      },
    } satisfies Edge;
  });
}

/**
 * selectedId를 기준으로 1-hop 관련 집합을 계산하고
 * 노드·엣지에 focus 상태(dim/강조)를 입혀 반환한다.
 *
 * 관련 집합 = selectedId + 선택 노드와 직접 연결된 엣지의 반대쪽 노드(1-hop).
 *   - edges에서 source === selectedId 또는 target === selectedId 인 엣지의 양쪽 끝점
 *   - 즉 의존(selectedId → X)과 역의존(X → selectedId) 모두 포함
 *
 * selectedId가 null이면 모든 노드/엣지를 정상 상태로 반환한다.
 */
function applyFocusToGraph(
  baseNodes: ModuleFlowNode[],
  baseEdges: Edge[],
  rawEdges: ModuleEdge[],
  selectedId: string | null,
): { nodes: ModuleFlowNode[]; edges: Edge[] } {
  if (!selectedId) {
    // focus 비활성 — 모두 정상
    const nodes = baseNodes.map((n) => ({
      ...n,
      data: { ...n.data, focusState: undefined },
    }));
    return { nodes, edges: baseEdges };
  }

  // 선택 노드와 연결된 엣지 ID 집합 및 1-hop 이웃 노드 ID 집합
  const relatedEdgeIds = new Set<string>();
  const neighborIds = new Set<string>([selectedId]);

  for (const e of rawEdges) {
    if (e.from === selectedId || e.to === selectedId) {
      relatedEdgeIds.add(`${e.from}->${e.to}->${e.kind}`);
      neighborIds.add(e.from);
      neighborIds.add(e.to);
    }
  }

  const nodes = baseNodes.map((n) => {
    let focusState: ModuleNodeData['focusState'];
    if (n.id === selectedId) {
      focusState = 'selected';
    } else if (neighborIds.has(n.id)) {
      focusState = 'neighbor';
    } else {
      focusState = 'dimmed';
    }
    return { ...n, data: { ...n.data, focusState } };
  });

  const edges = baseEdges.map((e) => {
    const isFocused = relatedEdgeIds.has(e.id);
    return {
      ...e,
      style: {
        ...e.style,
        opacity: isFocused ? (e.style?.opacity ?? 0.85) : 0.1,
        strokeWidth: isFocused ? ((e.style?.strokeWidth ?? 1.5) as number) + 0.5 : e.style?.strokeWidth,
        transition: 'opacity 0.3s ease',
      },
    };
  });

  return { nodes, edges };
}

export function ModuleGraph({
  modules,
  edges,
  selectedId = null,
  onSelectedChange,
}: ModuleGraphProps) {
  const baseNodes = useMemo(
    () => toFlowNodes(layoutModuleGraph(modules, edges)),
    [modules, edges],
  );
  const baseEdges = useMemo(() => toFlowEdges(edges), [edges]);

  const { nodes: focusedNodes, edges: focusedEdges } = useMemo(
    () => applyFocusToGraph(baseNodes, baseEdges, edges, selectedId),
    [baseNodes, baseEdges, edges, selectedId],
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (!onSelectedChange) return;
      // 같은 노드 재클릭 → 선택 해제
      onSelectedChange(node.id === selectedId ? null : node.id);
    },
    [selectedId, onSelectedChange],
  );

  const handlePaneClick = useCallback(() => {
    onSelectedChange?.(null);
  }, [onSelectedChange]);

  return (
    <div
      className="h-[600px] w-full overflow-hidden rounded-lg border border-border bg-surface/60 shadow-[var(--shadow-card)] backdrop-blur-[var(--blur-backdrop)]"
      role="application"
      aria-label="모듈 의존 관계 그래프"
    >
      <ReactFlow
        nodes={focusedNodes}
        edges={focusedEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.75}
        nodesConnectable={false}
        nodesFocusable={true}
        proOptions={{ hideAttribution: true }}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-border)"
        />
        <Controls
          showInteractive={false}
          className="!border !border-border !bg-surface/85 !shadow-[var(--shadow-card)] !backdrop-blur-[var(--blur-backdrop)]"
        />
        <GraphLegend selectedId={selectedId} onClear={() => onSelectedChange?.(null)} />
      </ReactFlow>
    </div>
  );
}

/**
 * 그래프 위에 떠 있는 범례 — 카드의 hard/soft 범례와 동일한 의미를 엣지에 매핑.
 * Panel 대신 absolute div로 글래스 패널을 직접 그려 토큰을 그대로 쓴다.
 *
 * focus 모드 활성 시 선택된 모듈명 + 해제 버튼을 보여준다.
 */
function GraphLegend({
  selectedId,
  onClear,
}: {
  selectedId?: string | null;
  onClear: () => void;
}) {
  return (
    <div className="absolute right-3 top-3 z-10 rounded-md border border-border bg-surface/85 px-3 py-2 text-[0.625rem] text-text-muted shadow-[var(--shadow-card)] backdrop-blur-[var(--blur-backdrop)]">
      {/* Focus 모드 활성 배너 */}
      {selectedId && (
        <div className="mb-2 flex items-center justify-between gap-3 border-b border-border pb-2">
          <div className="min-w-0">
            <p className="text-[0.625rem] text-text-muted">focus 모드</p>
            <p className="truncate font-semibold text-primary">{selectedId}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label="focus 해제"
            className="shrink-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[0.625rem] font-medium text-text-muted transition-colors hover:border-primary hover:text-primary"
          >
            해제
          </button>
        </div>
      )}
      <p className="mb-1.5 font-semibold text-text">의존 강도</p>
      <ul className="space-y-1">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-0 w-6 border-t-2 border-error" />
          <span>hard · 강한 결합 (끊기면 컴파일 깨짐)</span>
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-0 w-6 border-t-2 border-dashed border-text-muted"
          />
          <span>soft · 느슨한 결합</span>
        </li>
      </ul>
      {!selectedId && (
        <p className="mt-2 border-t border-border pt-2 text-[0.5625rem] text-text-muted">
          노드 클릭 → focus 모드
        </p>
      )}
    </div>
  );
}
