import { hasPermission, PERMISSIONS } from './index';

describe('hasPermission()', () => {
  describe('정확한 권한 일치', () => {
    it('보유한 권한과 요구 권한이 같으면 true', () => {
      expect(hasPermission(['post:read'], 'post:read')).toBe(true);
    });

    it('보유하지 않은 권한이면 false', () => {
      expect(hasPermission(['post:read'], 'post:write')).toBe(false);
    });

    it('빈 권한 배열이면 항상 false', () => {
      expect(hasPermission([], 'post:read')).toBe(false);
    });
  });

  describe('슈퍼 관리자 (*:*)', () => {
    it('*:* 보유 시 어떤 권한이든 true', () => {
      expect(hasPermission([PERMISSIONS.SUPER], 'post:read')).toBe(true);
      expect(hasPermission([PERMISSIONS.SUPER], 'admin:system-settings')).toBe(
        true,
      );
      expect(
        hasPermission([PERMISSIONS.SUPER], 'moderation:content:delete'),
      ).toBe(true);
    });
  });

  describe('리소스 와일드카드 (resource:*)', () => {
    it('post:* 보유 시 post:read 허용', () => {
      expect(hasPermission([PERMISSIONS.POST.ALL], PERMISSIONS.POST.READ)).toBe(
        true,
      );
    });

    it('post:* 보유 시 post:delete:own 허용', () => {
      expect(
        hasPermission([PERMISSIONS.POST.ALL], PERMISSIONS.POST.DELETE_OWN),
      ).toBe(true);
    });

    it('post:* 보유 시 다른 리소스(comment:read)는 거부', () => {
      expect(
        hasPermission([PERMISSIONS.POST.ALL], PERMISSIONS.COMMENT.READ),
      ).toBe(false);
    });

    it('board:* 보유 시 board:manage 허용', () => {
      expect(
        hasPermission([PERMISSIONS.BOARD.ALL], PERMISSIONS.BOARD.MANAGE),
      ).toBe(true);
    });

    it('email:* 보유 시 email:template:manage 허용', () => {
      expect(
        hasPermission(
          [PERMISSIONS.EMAIL.ALL],
          PERMISSIONS.EMAIL.TEMPLATE_MANAGE,
        ),
      ).toBe(true);
    });
  });

  describe('여러 권한 보유', () => {
    it('권한 중 하나라도 일치하면 true', () => {
      expect(hasPermission(['post:read', 'comment:read'], 'comment:read')).toBe(
        true,
      );
    });

    it('권한 중 하나가 와일드카드여도 true', () => {
      expect(
        hasPermission(['post:read', 'comment:*'], 'comment:delete:own'),
      ).toBe(true);
    });
  });

  describe('scope 포함 권한 (resource:action:scope)', () => {
    it('post:delete:own은 post:delete:all과 다름', () => {
      expect(
        hasPermission(
          [PERMISSIONS.POST.DELETE_OWN],
          PERMISSIONS.POST.DELETE_ALL,
        ),
      ).toBe(false);
    });

    it('post:* 는 post:delete:own을 포함', () => {
      expect(
        hasPermission([PERMISSIONS.POST.ALL], PERMISSIONS.POST.DELETE_OWN),
      ).toBe(true);
    });

    it('moderation:* 는 moderation:content:delete를 포함', () => {
      expect(
        hasPermission(
          [PERMISSIONS.MODERATION.ALL],
          PERMISSIONS.MODERATION.CONTENT_DELETE,
        ),
      ).toBe(true);
    });
  });
});
