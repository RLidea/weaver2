import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { ALL_PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { PermissionService } from '../../../../core/permission/services/permission.service';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
  SetGroupPermissionsDto,
  RemoveGroupPermissionsDto,
  AssignUsersToGroupDto,
} from '../dto/permission-group.dto';
import { SetResourcePermissionsDto } from '../dto/resource-permission.dto';

@Injectable()
export class AdminPermissionApiService {
  private readonly validPermissions: Set<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
  ) {
    this.validPermissions = new Set(ALL_PERMISSIONS.map((p) => p.value));
  }

  /**
   * 전체 PermissionGroup 목록 조회
   */
  async findAllGroups() {
    return this.prisma.permissionGroup.findMany({
      include: {
        _count: {
          select: {
            permissions: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 특정 PermissionGroup 상세 조회 (권한 목록 포함)
   */
  async findGroupById(id: string) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        permissions: {
          select: {
            id: true,
            permission: true,
          },
          orderBy: { permission: 'asc' },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('권한 그룹을 찾을 수 없습니다.');
    }

    return group;
  }

  /**
   * PermissionGroup 생성
   */
  async createGroup(dto: CreatePermissionGroupDto) {
    const existing = await this.prisma.permissionGroup.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `'${dto.name}' 이름의 그룹이 이미 존재합니다.`,
      );
    }

    return this.prisma.permissionGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: {
        _count: {
          select: {
            permissions: true,
            users: true,
          },
        },
      },
    });
  }

  /**
   * PermissionGroup 수정
   */
  async updateGroup(id: string, dto: UpdatePermissionGroupDto) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException('권한 그룹을 찾을 수 없습니다.');
    }

    // 시스템 그룹 이름 변경 방지
    if (group.isSystem && dto.name && dto.name !== group.name) {
      throw new BadRequestException('시스템 그룹의 이름은 변경할 수 없습니다.');
    }

    // 이름 중복 체크
    if (dto.name && dto.name !== group.name) {
      const existing = await this.prisma.permissionGroup.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(
          `'${dto.name}' 이름의 그룹이 이미 존재합니다.`,
        );
      }
    }

    return this.prisma.permissionGroup.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: {
        _count: {
          select: {
            permissions: true,
            users: true,
          },
        },
      },
    });
  }

  /**
   * PermissionGroup 삭제
   */
  async deleteGroup(id: string) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('권한 그룹을 찾을 수 없습니다.');
    }

    if (group.isSystem) {
      throw new BadRequestException('시스템 그룹은 삭제할 수 없습니다.');
    }

    if (group._count.users > 0) {
      throw new BadRequestException(
        `이 그룹에 ${group._count.users}명의 사용자가 할당되어 있습니다. 먼저 사용자를 해제해주세요.`,
      );
    }

    await this.prisma.permissionGroup.delete({
      where: { id },
    });

    return { message: `'${group.name}' 그룹이 삭제되었습니다.` };
  }

  // ============ Group Permission Management (5-2) ============

  /**
   * 그룹 권한 전체 교체 (기존 권한 삭제 후 새로 설정)
   */
  async setGroupPermissions(id: string, dto: SetGroupPermissionsDto) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException('권한 그룹을 찾을 수 없습니다.');
    }

    // SuperAdmin의 *:* 제거 방지
    if (
      group.isSystem &&
      group.name === 'SuperAdmin' &&
      !dto.permissions.includes('*:*')
    ) {
      throw new BadRequestException(
        'SuperAdmin 그룹에서 슈퍼 관리자 권한(*:*)은 제거할 수 없습니다.',
      );
    }

    // 유효성 검증
    const invalidPermissions = dto.permissions.filter(
      (p) => !this.validPermissions.has(p),
    );
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `유효하지 않은 권한: ${invalidPermissions.join(', ')}`,
      );
    }

    // 트랜잭션: 기존 권한 삭제 + 새 권한 추가
    await this.prisma.$transaction([
      this.prisma.permissionGroupPermission.deleteMany({
        where: { permissionGroupId: id },
      }),
      ...dto.permissions.map((permission) =>
        this.prisma.permissionGroupPermission.create({
          data: { permissionGroupId: id, permission },
        }),
      ),
    ]);

    // 캐시 무효화: 해당 그룹 소속 유저 전원
    await this.invalidateGroupUsersCache(id);

    return this.findGroupById(id);
  }

  /**
   * 그룹에서 특정 권한 제거
   */
  async removeGroupPermissions(id: string, dto: RemoveGroupPermissionsDto) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException('권한 그룹을 찾을 수 없습니다.');
    }

    // SuperAdmin의 *:* 제거 방지
    if (
      group.isSystem &&
      group.name === 'SuperAdmin' &&
      dto.permissions.includes('*:*')
    ) {
      throw new BadRequestException(
        'SuperAdmin 그룹에서 슈퍼 관리자 권한(*:*)은 제거할 수 없습니다.',
      );
    }

    await this.prisma.permissionGroupPermission.deleteMany({
      where: {
        permissionGroupId: id,
        permission: { in: dto.permissions },
      },
    });

    // 캐시 무효화
    await this.invalidateGroupUsersCache(id);

    return this.findGroupById(id);
  }

  // ============ User-Group Assignment (5-3) ============

  /**
   * 그룹에 할당된 유저 목록 조회
   */
  async findGroupUsers(groupId: string) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('권한 그룹을 찾을 수 없습니다.');
    }

    const assignments = await this.prisma.userPermissionGroup.findMany({
      where: { permissionGroupId: groupId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments.map((a) => ({
      ...a.user,
      assignedAt: a.createdAt,
    }));
  }

  /**
   * 유저를 그룹에 할당
   */
  async assignUsersToGroup(groupId: string, dto: AssignUsersToGroupDto) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('권한 그룹을 찾을 수 없습니다.');
    }

    // 유저 존재 여부 확인
    const users = await this.prisma.user.findMany({
      where: { id: { in: dto.userIds } },
      select: { id: true },
    });

    const foundIds = new Set(users.map((u) => u.id));
    const notFoundIds = dto.userIds.filter((id) => !foundIds.has(id));
    if (notFoundIds.length > 0) {
      throw new NotFoundException(
        `존재하지 않는 사용자: ${notFoundIds.join(', ')}`,
      );
    }

    // 이미 할당된 유저 필터링
    const existing = await this.prisma.userPermissionGroup.findMany({
      where: {
        permissionGroupId: groupId,
        userId: { in: dto.userIds },
      },
      select: { userId: true },
    });

    const existingIds = new Set(existing.map((e) => e.userId));
    const newUserIds = dto.userIds.filter((id) => !existingIds.has(id));

    if (newUserIds.length > 0) {
      await this.prisma.userPermissionGroup.createMany({
        data: newUserIds.map((userId) => ({
          userId,
          permissionGroupId: groupId,
        })),
      });

      // 새로 할당된 유저 캐시 무효화
      for (const userId of newUserIds) {
        this.permissionService.invalidateCache(userId);
      }
    }

    return {
      assigned: newUserIds.length,
      skipped: existingIds.size,
      message: `${newUserIds.length}명 할당 완료${existingIds.size > 0 ? ` (${existingIds.size}명 이미 할당됨)` : ''}`,
    };
  }

  /**
   * 유저를 그룹에서 해제
   */
  async removeUserFromGroup(groupId: string, userId: string) {
    const assignment = await this.prisma.userPermissionGroup.findUnique({
      where: {
        userId_permissionGroupId: {
          userId,
          permissionGroupId: groupId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        '해당 사용자가 이 그룹에 할당되어 있지 않습니다.',
      );
    }

    await this.prisma.userPermissionGroup.delete({
      where: {
        userId_permissionGroupId: {
          userId,
          permissionGroupId: groupId,
        },
      },
    });

    // 캐시 무효화
    this.permissionService.invalidateCache(userId);

    return { message: '사용자 그룹 할당이 해제되었습니다.' };
  }

  // ============ Resource Permission Management (5-4) ============

  /**
   * 전체 ResourcePermission 규칙 목록 조회
   */
  async findAllResourcePermissions(resourceType?: string) {
    return this.prisma.resourcePermission.findMany({
      where: resourceType ? { resourceType } : undefined,
      include: {
        allowedGroups: {
          include: {
            permissionGroup: { select: { id: true, name: true } },
          },
        },
        deniedGroups: {
          include: {
            permissionGroup: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [
        { resourceType: 'asc' },
        { resourceId: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  /**
   * 특정 리소스의 ResourcePermission 규칙 조회
   */
  async findResourcePermissions(resourceType: string, resourceId: string) {
    return this.prisma.resourcePermission.findMany({
      where: { resourceType, resourceId },
      include: {
        allowedGroups: {
          include: {
            permissionGroup: { select: { id: true, name: true } },
          },
        },
        deniedGroups: {
          include: {
            permissionGroup: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { action: 'asc' },
    });
  }

  /**
   * 리소스 권한 규칙 설정 (기존 규칙 삭제 후 새로 설정)
   */
  async setResourcePermissions(
    resourceType: string,
    resourceId: string,
    dto: SetResourcePermissionsDto,
  ) {
    // 그룹 ID 유효성 검증
    const allGroupIds = new Set<string>();
    for (const rule of dto.rules) {
      rule.allowedGroupIds?.forEach((id) => allGroupIds.add(id));
      rule.deniedGroupIds?.forEach((id) => allGroupIds.add(id));
    }

    if (allGroupIds.size > 0) {
      const groups = await this.prisma.permissionGroup.findMany({
        where: { id: { in: [...allGroupIds] } },
        select: { id: true },
      });
      const foundIds = new Set(groups.map((g) => g.id));
      const notFoundIds = [...allGroupIds].filter((id) => !foundIds.has(id));
      if (notFoundIds.length > 0) {
        throw new NotFoundException(
          `존재하지 않는 권한 그룹: ${notFoundIds.join(', ')}`,
        );
      }
    }

    // 트랜잭션: 기존 규칙 삭제 + 새 규칙 생성
    await this.prisma.$transaction(async (tx) => {
      // 기존 규칙 삭제
      await tx.resourcePermission.deleteMany({
        where: { resourceType, resourceId },
      });

      // 새 규칙 생성
      for (const rule of dto.rules) {
        await tx.resourcePermission.create({
          data: {
            resourceType,
            resourceId,
            action: rule.action,
            allowAnonymous: rule.allowAnonymous ?? false,
            allowedGroups: {
              create: (rule.allowedGroupIds ?? []).map((permissionGroupId) => ({
                permissionGroupId,
              })),
            },
            deniedGroups: {
              create: (rule.deniedGroupIds ?? []).map((permissionGroupId) => ({
                permissionGroupId,
              })),
            },
          },
        });
      }
    });

    return this.findResourcePermissions(resourceType, resourceId);
  }

  /**
   * 특정 리소스의 특정 액션 규칙 삭제
   */
  async deleteResourcePermission(
    resourceType: string,
    resourceId: string,
    action: string,
  ) {
    const rule = await this.prisma.resourcePermission.findUnique({
      where: {
        resourceType_resourceId_action: {
          resourceType,
          resourceId,
          action,
        },
      },
    });

    if (!rule) {
      throw new NotFoundException(
        `'${resourceType}/${resourceId}' 리소스의 '${action}' 규칙을 찾을 수 없습니다.`,
      );
    }

    await this.prisma.resourcePermission.delete({
      where: { id: rule.id },
    });

    return { message: `'${action}' 규칙이 삭제되었습니다.` };
  }

  // ============ Internal Helpers ============

  /**
   * 해당 그룹 소속 유저 전원의 권한 캐시 무효화
   */
  private async invalidateGroupUsersCache(groupId: string) {
    const users = await this.prisma.userPermissionGroup.findMany({
      where: { permissionGroupId: groupId },
      select: { userId: true },
    });

    for (const { userId } of users) {
      this.permissionService.invalidateCache(userId);
    }
  }
}
