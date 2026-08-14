import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@weaver2/prisma';
import { PermissionService } from './permission.service';

/**
 * `hasResourcePermission` 은 게시판 읽기·쓰기가 실제로 통과하는 자리다.
 * 그런데 이 서비스에는 테스트가 하나도 없었다 — 권한이 조용히 열리거나 닫혀도
 * 아무것도 깨지지 않는 상태였다.
 *
 * 여기서 고정하는 것은 **네 부류의 사용자**가 규칙 하나를 만났을 때의 답이다:
 * 비로그인 · 슈퍼관리자 · 허용 그룹 소속 · 아무 데도 아닌 로그인 사용자.
 */
describe('PermissionService.hasResourcePermission', () => {
  const ADMIN_GROUP = 'group-admin';
  const MEMBER_GROUP = 'group-member';

  /**
   * 규칙 한 건과 사용자 권한/그룹을 세팅한 서비스를 만든다.
   *
   * `rule: null` 은 "그 자원에 그 액션 규칙이 아예 없음" 을 뜻한다.
   */
  function build(options: {
    rule: {
      allowAnonymous: boolean;
      allowedGroupIds?: string[];
      deniedGroupIds?: string[];
    } | null;
    userPermissions?: string[];
    userGroupIds?: string[];
  }) {
    const prisma = {
      resourcePermission: {
        findUnique: jest.fn().mockResolvedValue(
          options.rule
            ? {
                allowAnonymous: options.rule.allowAnonymous,
                allowedGroups: (options.rule.allowedGroupIds ?? []).map(
                  (permissionGroupId) => ({ permissionGroupId }),
                ),
                deniedGroups: (options.rule.deniedGroupIds ?? []).map(
                  (permissionGroupId) => ({ permissionGroupId }),
                ),
              }
            : null,
        ),
      },
      userPermissionGroup: {
        findMany: jest.fn().mockResolvedValue(
          (options.userGroupIds ?? []).map((permissionGroupId) => ({
            permissionGroupId,
            permissionGroup: {
              permissions: (options.userPermissions ?? []).map(
                (permission) => ({ permission }),
              ),
            },
          })),
        ),
      },
    } as unknown as PrismaService;

    const config = {
      // 캐시를 끈다 — 테스트끼리 권한 집합이 새지 않게.
      get: (key: string) =>
        key === 'PERMISSION_CACHE_STRATEGY' ? 'none' : undefined,
    } as unknown as ConfigService;

    return new PermissionService(prisma, config);
  }

  const ask = (service: PermissionService, userId: string | null) =>
    service.hasResourcePermission(userId, 'board', 'board-1', 'write');

  describe('슈퍼관리자 (*:*)', () => {
    it('허용 그룹에 없어도 통과한다 — 최고관리자가 공지 게시판에 못 쓰던 문제', async () => {
      const service = build({
        rule: { allowAnonymous: false, allowedGroupIds: [ADMIN_GROUP] },
        userPermissions: ['*:*'],
        userGroupIds: ['group-super'],
      });

      await expect(ask(service, 'user-super')).resolves.toBe(true);
    });

    it('거부 그룹에 들어 있어도 통과한다 — hasPermission 과 답을 맞춘 결과', async () => {
      const service = build({
        rule: {
          allowAnonymous: false,
          allowedGroupIds: [ADMIN_GROUP],
          deniedGroupIds: ['group-super'],
        },
        userPermissions: ['*:*'],
        userGroupIds: ['group-super'],
      });

      await expect(ask(service, 'user-super')).resolves.toBe(true);
    });

    it('규칙이 아예 없으면 슈퍼관리자도 거부된다 — "규칙 없으면 기본 거부" 는 그대로', async () => {
      const service = build({
        rule: null,
        userPermissions: ['*:*'],
        userGroupIds: ['group-super'],
      });

      await expect(ask(service, 'user-super')).resolves.toBe(false);
    });

    it('부분 와일드카드(board:*)는 통과시키지 않는다 — *:* 정확 일치만 본다', async () => {
      const service = build({
        rule: { allowAnonymous: false, allowedGroupIds: [ADMIN_GROUP] },
        userPermissions: ['board:*'],
        userGroupIds: [MEMBER_GROUP],
      });

      await expect(ask(service, 'user-member')).resolves.toBe(false);
    });
  });

  describe('일반 사용자 — 기존 동작이 그대로인지', () => {
    it('허용 그룹 소속이면 통과', async () => {
      const service = build({
        rule: { allowAnonymous: false, allowedGroupIds: [ADMIN_GROUP] },
        userGroupIds: [ADMIN_GROUP],
      });

      await expect(ask(service, 'user-admin')).resolves.toBe(true);
    });

    it('허용 그룹이 비어 있으면 로그인만으로 통과', async () => {
      const service = build({
        rule: { allowAnonymous: false, allowedGroupIds: [] },
        userGroupIds: [MEMBER_GROUP],
      });

      await expect(ask(service, 'user-member')).resolves.toBe(true);
    });

    it('허용 그룹에 없으면 거부', async () => {
      const service = build({
        rule: { allowAnonymous: false, allowedGroupIds: [ADMIN_GROUP] },
        userGroupIds: [MEMBER_GROUP],
      });

      await expect(ask(service, 'user-member')).resolves.toBe(false);
    });

    it('거부 그룹이 허용 그룹을 이긴다', async () => {
      const service = build({
        rule: {
          allowAnonymous: false,
          allowedGroupIds: [ADMIN_GROUP],
          deniedGroupIds: [ADMIN_GROUP],
        },
        userGroupIds: [ADMIN_GROUP],
      });

      await expect(ask(service, 'user-admin')).resolves.toBe(false);
    });
  });

  describe('비로그인', () => {
    it('allowAnonymous 가 false 면 거부', async () => {
      const service = build({ rule: { allowAnonymous: false } });

      await expect(ask(service, null)).resolves.toBe(false);
    });

    it('allowAnonymous 가 true 면 통과', async () => {
      const service = build({ rule: { allowAnonymous: true } });

      await expect(ask(service, null)).resolves.toBe(true);
    });
  });
});
