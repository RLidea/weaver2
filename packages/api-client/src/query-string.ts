/**
 * 목록 파라미터를 쿼리스트링으로 바꾼다. 값이 없는 키는 **아예 빼서** 보낸다.
 *
 * 빈 문자열을 빼는 것이 요점이다 — 검색을 지운 것과 빈 문자열로 검색하는 것이 서로
 * 다른 요청이 되어선 안 되고, 그래야 캐시 키도 하나로 모인다.
 *
 * `0` 과 `false` 는 **남긴다.** 그것들은 값이 없는 것이 아니라 값이다.
 */
export function toQueryString(params: object | undefined): string {
  if (!params) return '';

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    qs.set(key, String(value));
  }

  const str = qs.toString();
  return str ? `?${str}` : '';
}
