/** 관리 화면 「API 토큰」이 고르기 단추로 보이는 범위 하나 */
export interface ApiTokenScopeOption {
  /** `@ApiTokenScope('…')` 에 쓴 이름 그대로 */
  value: string;
  label: string;
}

/**
 * 파생 프로젝트가 범위를 등록하는 자리. 경로에 `@ApiTokenScope('…')` 를 붙였으면 여기에 한 줄 더한다.
 * 서버는 이 목록으로 거르지 않는다(범위는 형식만 맞으면 자유 문자열) — 화면의 고르기 단추일 뿐이다.
 *
 * weaver2 는 범위를 하나도 정의하지 않고 빈 배열로만 배포한다 — 파생 쪽이 채운 뒤에는 upstream 이 건드리지 않는다.
 *
 * @example
 * export const API_TOKEN_SCOPES: ApiTokenScopeOption[] = [
 *   { value: 'blog:draft', label: '블로그 초안 넣기' },
 * ];
 */
export const API_TOKEN_SCOPES: ApiTokenScopeOption[] = [];
