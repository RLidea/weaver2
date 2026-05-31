import type { Module, ModuleEdge, ModuleLayer } from '../types';

/**
 * 그래프 노드 1개의 배치 결과.
 *
 * - `isSynthetic`: 매니페스트가 없는 의존 대상(core 모듈 등 edge의 to에만 존재).
 *   이런 노드는 옅게 그려 "외부/코어 의존"임을 시각적으로 구분한다.
 */
export interface LaidOutNode {
  id: string;
  layer: ModuleLayer;
  description: string;
  isSynthetic: boolean;
  position: { x: number; y: number };
}

const NODE_WIDTH = 200;
const COL_GAP = 64; // 같은 rank 내 노드 간 가로 간격
const ROW_GAP = 132; // rank(세로 레벨) 간 간격

/**
 * 의존 그래프를 "위 = 상류(의존 대상) / 아래 = 하류(의존하는 쪽)"로 흐르는
 * 계층 레이아웃으로 배치한다.
 *
 * dagre 같은 외부 의존 없이, 최장 경로(longest-path) 레벨링으로 rank를 매긴다:
 *   - 아무도 의존하지 않는 말단(features) 모듈일수록 아래(높은 rank)
 *   - 여러 모듈이 공통으로 의존하는 코어(auth/permission 등)는 위(rank 0 근처)
 * 모듈 수가 늘거나 의존이 바뀌어도 자동으로 재배치되어 레이아웃이 깨지지 않는다.
 *
 * edge.to가 modules에 없으면(매니페스트 없는 core 의존) synthetic 노드로 합성한다.
 */
export function layoutModuleGraph(
  modules: Module[],
  edges: ModuleEdge[],
): LaidOutNode[] {
  // 1) 실제 모듈 + edge가 가리키는 synthetic 노드까지 전체 노드 집합 구성
  const moduleById = new Map(modules.map((m) => [m.id, m]));
  const allIds = new Set<string>(moduleById.keys());
  for (const e of edges) {
    allIds.add(e.from);
    allIds.add(e.to);
  }

  // 2) 의존 방향(from → to, to가 상류). rank는 "from은 to보다 아래"가 되도록 계산.
  //    각 노드의 rank = (자신이 의존하는 대상들의 rank 최대값) + 1.
  //    사이클이 있어도 안전하도록 방문 캐시 + 진행 중 마킹으로 무한루프를 막는다.
  const dependsOn = new Map<string, string[]>();
  for (const id of allIds) dependsOn.set(id, []);
  for (const e of edges) dependsOn.get(e.from)?.push(e.to);

  const rankCache = new Map<string, number>();
  const inProgress = new Set<string>();

  function rankOf(id: string): number {
    const cached = rankCache.get(id);
    if (cached !== undefined) return cached;
    if (inProgress.has(id)) return 0; // 사이클 차단
    inProgress.add(id);

    let maxUpstream = -1;
    for (const target of dependsOn.get(id) ?? []) {
      maxUpstream = Math.max(maxUpstream, rankOf(target));
    }
    inProgress.delete(id);

    const rank = maxUpstream + 1;
    rankCache.set(id, rank);
    return rank;
  }

  for (const id of allIds) rankOf(id);

  // 3) rank별로 묶고, 각 rank 안에서는 id 알파벳 순으로 안정 정렬해 가로 배치.
  const byRank = new Map<number, string[]>();
  for (const id of allIds) {
    const r = rankCache.get(id) ?? 0;
    const bucket = byRank.get(r) ?? [];
    bucket.push(id);
    byRank.set(r, bucket);
  }

  const maxRank = Math.max(0, ...byRank.keys());

  const result: LaidOutNode[] = [];
  for (let rank = 0; rank <= maxRank; rank++) {
    const ids = (byRank.get(rank) ?? []).sort((a, b) => a.localeCompare(b));
    const rowWidth = ids.length * NODE_WIDTH + (ids.length - 1) * COL_GAP;
    const startX = -rowWidth / 2;

    ids.forEach((id, index) => {
      const mod = moduleById.get(id);
      const x = startX + index * (NODE_WIDTH + COL_GAP);
      // 위쪽(rank 0)이 상류가 되도록 rank가 작을수록 y가 작음.
      const y = rank * ROW_GAP;

      result.push({
        id,
        layer: mod?.layer ?? 'core',
        description: mod?.description ?? '',
        isSynthetic: !mod,
        position: { x, y },
      });
    });
  }

  return result;
}

export const MODULE_GRAPH_NODE_WIDTH = NODE_WIDTH;
