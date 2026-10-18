/**
 * `field:asc,field2:desc` 를 정렬 객체로. allowed 를 주면 그 필드만 — 허용 목록은 **쓰기 전에** 본다.
 * 방향은 asc/desc 만(그 밖은 asc).
 */
export function parseSort(
  sort?: string,
  allowed?: readonly string[],
): Record<string, 'asc' | 'desc'> {
  // 객체에 요청 이름을 바로 쓰지 않는다 — Map 에 모았다가 한 번에 바꾼다
  const result = new Map<string, 'asc' | 'desc'>();
  if (!sort) return {};
  for (const part of sort.split(',')) {
    const [rawField, rawOrder] = part.split(':');
    const field = rawField?.trim();
    if (!field) continue;
    if (allowed && !allowed.includes(field)) continue;
    result.set(field, rawOrder?.trim() === 'desc' ? 'desc' : 'asc');
  }
  return Object.fromEntries(result);
}
