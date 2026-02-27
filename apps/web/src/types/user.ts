/**
 * 백엔드 UserDto 기반 사용자 타입
 * GET /v1/users/me 응답 데이터
 */
export interface User {
  id: string;
  username: string;
  displayName: string;
}
