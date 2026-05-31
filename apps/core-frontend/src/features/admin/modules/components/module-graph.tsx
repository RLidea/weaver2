'use client';

import { useMemo } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { cn } from '@/shared/lib/cn';
import type { Module, ModuleEdge, ModuleLayer } from '../types';
import { layoutModuleGraph, type LaidOutNode } from './module-graph-layout';

interface ModuleGraphProps {
  modules: Module[];
  edges: ModuleEdge[];
}

/** 커스텀 노드가 받는 데이터. */
interface ModuleNodeData extends Record<string, unknown> {
  layer: ModuleLayer;
  description: string;
  isSynthetic: boolean;
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
 */
function ModuleNode({ data, id }: NodeProps<ModuleFlowNode>) {
  const { layer, description, isSynthetic } = data;

  return (
    <div
      className={cn(
        'w-[200px] overflow-hidden rounded-lg border shadow-[var(--shadow-card)] backdrop-blur-[var(--blur-backdrop)]',
        isSynthetic
          ? 'border-dashed border-border bg-surface-2/60 opacity-70'
          : 'border-border bg-surface/85',
      )}
    >
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
    },
    draggable: true,
    selectable: false,
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

export function ModuleGraph({ modules, edges }: ModuleGraphProps) {
  const nodes = useMemo(
    () => toFlowNodes(layoutModuleGraph(modules, edges)),
    [modules, edges],
  );
  const flowEdges = useMemo(() => toFlowEdges(edges), [edges]);

  return (
    <div
      className="h-[600px] w-full overflow-hidden rounded-lg border border-border bg-surface/60 shadow-[var(--shadow-card)] backdrop-blur-[var(--blur-backdrop)]"
      role="application"
      aria-label="모듈 의존 관계 그래프"
    >
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.75}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
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
        <GraphLegend />
      </ReactFlow>
    </div>
  );
}

/**
 * 그래프 위에 떠 있는 범례 — 카드의 hard/soft 범례와 동일한 의미를 엣지에 매핑.
 * Panel 대신 absolute div로 글래스 패널을 직접 그려 토큰을 그대로 쓴다.
 */
function GraphLegend() {
  return (
    <div className="absolute right-3 top-3 z-10 rounded-md border border-border bg-surface/85 px-3 py-2 text-[0.625rem] text-text-muted shadow-[var(--shadow-card)] backdrop-blur-[var(--blur-backdrop)]">
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
    </div>
  );
}
