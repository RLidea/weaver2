/**
 * 예약된 사용자 이름 (로그인 ID)
 * 대소문자 구분 없이 정확히 일치하면 거부
 */
export const RESERVED_USERNAMES = new Set([
  // 관리자 계열
  'admin',
  'administrator',
  'superadmin',
  'super_admin',
  'super-admin',
  // 운영자 계열
  'operator',
  'op',
  // 모더레이터 계열
  'moderator',
  'mod',
  // 시스템 계열
  'system',
  'sys',
  'root',
  'service',
  // 지원 계열
  'support',
  'help',
  'helpdesk',
  'contact',
  'info',
  'noreply',
  'no-reply',
  // 플랫폼 계열
  'weaver',
  'official',
  'staff',
  'team',
]);

/**
 * 표시 이름(닉네임)에 포함되면 거부하는 키워드
 * 대소문자/공백 제거 후 포함 여부 검사
 */
export const RESERVED_DISPLAY_NAME_KEYWORDS = [
  // 한국어
  '관리자',
  '운영자',
  '모더레이터',
  '운영팀',
  '관리팀',
  '공식',
  '시스템',
  '위버', // 플랫폼명
  // 영어
  'admin',
  'administrator',
  'moderator',
  'operator',
  'official',
  'system',
  'staff',
  'support',
  'weaver', // 플랫폼명
];
