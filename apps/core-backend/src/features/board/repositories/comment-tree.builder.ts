import { CommentDto } from '../dto/comment.dto';

type FlatComment = CommentDto;

/**
 * 평면 조회된 댓글 목록을 트리 구조로 빌드.
 *
 * - parentId가 가시 영역 안에 없는 노드는 고아 처리(skip).
 * - 자식들은 createdAt 오름차순 (조회 시 이미 정렬되어 있다고 가정).
 *
 * @param flat   평면 댓글 배열 (deletedAt/hiddenAt이 이미 필터된 상태)
 * @param rootIds 트리에 포함할 루트 ID 집합. 미지정 시 parentId가 null인 모든 노드.
 */
export function buildCommentTree(
  flat: FlatComment[],
  rootIds?: Set<string>,
): CommentDto[] {
  const byId = new Map<string, CommentDto & { children: CommentDto[] }>();
  for (const c of flat) {
    byId.set(c.id, { ...c, children: [] });
  }

  const childrenMap = new Map<string, CommentDto[]>();
  for (const node of byId.values()) {
    if (node.parentId) {
      const list = childrenMap.get(node.parentId) ?? [];
      list.push(node);
      childrenMap.set(node.parentId, list);
    }
  }

  function attach(id: string): CommentDto | null {
    const node = byId.get(id);
    if (!node) return null;
    const childIds = childrenMap.get(id) ?? [];
    node.children = childIds
      .map((c) => attach(c.id))
      .filter((c): c is CommentDto => c !== null);
    return node;
  }

  const roots: CommentDto[] = [];
  for (const node of byId.values()) {
    const isRoot = rootIds ? rootIds.has(node.id) : node.parentId == null;
    if (isRoot) {
      const built = attach(node.id);
      if (built) roots.push(built);
    }
  }
  return roots;
}
