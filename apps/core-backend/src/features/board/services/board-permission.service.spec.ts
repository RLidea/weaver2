import { ForbiddenException } from '@nestjs/common';
import {
  BoardActionType,
  BoardPermissionService,
} from './board-permission.service';
import { PermissionService } from '../../../core/permission/services/permission.service';
import { PrismaService } from '@weaver2/prisma';
import { CommonAuthUserDto } from '@weaver2/common';

describe('BoardPermissionService', () => {
  let service: BoardPermissionService;
  let permission: { hasResourcePermission: jest.Mock };

  const ownerItem = { authorId: 'user-1', boardId: 'board-1' };
  const otherItem = { authorId: 'user-2', boardId: 'board-1' };
  const owner = { id: 'user-1', isLogin: true } as CommonAuthUserDto;
  const other = { id: 'user-3', isLogin: true } as CommonAuthUserDto;

  beforeEach(() => {
    permission = { hasResourcePermission: jest.fn() };
    service = new BoardPermissionService(
      {} as PrismaService,
      permission as unknown as PermissionService,
    );
  });

  describe('canEdit / IDOR 회귀 방지', () => {
    it('비로그인은 EDIT_OWN 조회조차 하지 않고 false 반환', async () => {
      const result = await service.canEdit(ownerItem, undefined);
      expect(result).toBe(false);
      expect(permission.hasResourcePermission).not.toHaveBeenCalled();
    });

    it('isLogin=false도 동일하게 false', async () => {
      const result = await service.canEdit(ownerItem, {
        isLogin: false,
      } as CommonAuthUserDto);
      expect(result).toBe(false);
      expect(permission.hasResourcePermission).not.toHaveBeenCalled();
    });

    it('본인 글이면 EDIT_OWN 권한 체크', async () => {
      permission.hasResourcePermission.mockResolvedValue(true);
      await service.canEdit(ownerItem, owner);
      expect(permission.hasResourcePermission).toHaveBeenCalledWith(
        'user-1',
        'board',
        'board-1',
        BoardActionType.EDIT_OWN,
      );
    });

    it('타인 글이면 EDIT_ALL 권한 체크', async () => {
      permission.hasResourcePermission.mockResolvedValue(false);
      await service.canEdit(otherItem, other);
      expect(permission.hasResourcePermission).toHaveBeenCalledWith(
        'user-3',
        'board',
        'board-1',
        BoardActionType.EDIT_ALL,
      );
    });
  });

  describe('canDelete / IDOR 회귀 방지', () => {
    it('비로그인은 즉시 false', async () => {
      const result = await service.canDelete(ownerItem, undefined);
      expect(result).toBe(false);
      expect(permission.hasResourcePermission).not.toHaveBeenCalled();
    });

    it('본인 글이면 DELETE_OWN', async () => {
      permission.hasResourcePermission.mockResolvedValue(true);
      await service.canDelete(ownerItem, owner);
      expect(permission.hasResourcePermission).toHaveBeenCalledWith(
        'user-1',
        'board',
        'board-1',
        BoardActionType.DELETE_OWN,
      );
    });

    it('타인 글이면 DELETE_ALL', async () => {
      permission.hasResourcePermission.mockResolvedValue(false);
      await service.canDelete(otherItem, other);
      expect(permission.hasResourcePermission).toHaveBeenCalledWith(
        'user-3',
        'board',
        'board-1',
        BoardActionType.DELETE_ALL,
      );
    });
  });

  describe('require* helpers', () => {
    it('requireEditPermission은 권한 없을 때 ForbiddenException', async () => {
      permission.hasResourcePermission.mockResolvedValue(false);
      await expect(
        service.requireEditPermission(ownerItem, owner),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('requireDeletePermission은 비로그인 때 ForbiddenException', async () => {
      await expect(
        service.requireDeletePermission(ownerItem, undefined),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('requirePermission은 권한 통과 시 throw 없음', async () => {
      permission.hasResourcePermission.mockResolvedValue(true);
      await expect(
        service.requirePermission('board-1', BoardActionType.READ, owner),
      ).resolves.toBeUndefined();
    });
  });
});
