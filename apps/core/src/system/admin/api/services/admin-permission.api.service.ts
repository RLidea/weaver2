import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
} from '../dto/permission-group.dto';

@Injectable()
export class AdminPermissionApiService {
  constructor(private readonly prisma: PrismaService) {}

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
}
