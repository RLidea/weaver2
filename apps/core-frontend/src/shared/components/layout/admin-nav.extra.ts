import type { AdminNavItem } from './admin-sidebar';

/**
 * 파생 프로젝트가 관리 메뉴를 더하는 자리. 사이드바가 기본 메뉴 뒤에 이어 붙이고,
 * 기본 메뉴와 같은 권한 판정(hasPermission)으로 거른다.
 *
 * weaver2 는 이 파일을 빈 배열로만 배포한다 — 파생 쪽이 채운 뒤에는 upstream 이 건드리지 않는다.
 *
 * @example
 * export const ADMIN_NAV_EXTRA: AdminNavItem[] = [
 *   { label: '블로그', href: '/admin/blog', Icon: FileTextIcon, permission: PERMISSIONS.BOARD.MANAGE, exact: false },
 * ];
 */
export const ADMIN_NAV_EXTRA: AdminNavItem[] = [];
