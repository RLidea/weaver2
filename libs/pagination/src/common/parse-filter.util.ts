/**
 * `key:value,key2:value2` 를 필터 객체로. allowed 를 주면 그 키만 — 허용 목록은 **쓰기 전에** 본다
 * (요청이 정한 이름이 그대로 객체 키가 되지 않게). allowed 가 빈 배열이면 아무것도 통과시키지 않는다.
 */
export function parseFilter(
  filter?: string,
  allowed?: readonly string[],
): Record<string, string> {
  // 객체에 요청 이름을 바로 쓰지 않는다 — Map 에 모았다가 한 번에 바꾼다(__proto__ 같은 이름이 무해하다)
  const result = new Map<string, string>();
  if (!filter) return {};
  for (const part of filter.split(',')) {
    const [rawKey, rawValue] = part.split(':');
    const key = rawKey?.trim();
    const value = rawValue?.trim();
    if (!key || !value) continue;
    if (allowed && !allowed.includes(key)) continue;
    result.set(key, value);
  }
  return Object.fromEntries(result);
}
