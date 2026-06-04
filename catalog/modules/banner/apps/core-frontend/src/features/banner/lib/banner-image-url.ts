/**
 * imageFileId → 서빙 URL.
 * apiBase는 ApiClient base와 동일해야 함 (인증 쿠키로 302 동작).
 */
export function bannerImageUrl(apiBase: string, imageFileId: string): string {
  return `${apiBase}/v1/upload/${imageFileId}/file`;
}
