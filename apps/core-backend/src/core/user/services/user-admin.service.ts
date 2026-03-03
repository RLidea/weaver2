import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { OffsetResponseDto } from '@weaver2/pagination';
import { STORAGE_PROVIDER, StorageProvider } from '@weaver2/upload';
import { AdminUserDto } from '../dto/admin-user.dto';
import { AdminUsersQueryDto } from '../dto/admin-users-query.dto';
import { AdminUpdateUserDto } from '../dto/admin-update-user.dto';
import { SuspendUserDto } from '../dto/suspend-user.dto';
import {
  findAdminUsersQuery,
  AdminUserWithGroups,
} from '../repositories/find-admin-users.query';
import { FindAdminUserByIdQuery } from '../repositories/find-admin-user-by-id.query';
import { SuspendUserCommand } from '../repositories/suspend-user.command';
import { UnsuspendUserCommand } from '../repositories/unsuspend-user.command';
import { SoftDeleteUserCommand } from '../repositories/soft-delete-user.command';

@Injectable()
export class UserAdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async findUsers(
    query: AdminUsersQueryDto,
  ): Promise<OffsetResponseDto<AdminUserDto>> {
    const result = await findAdminUsersQuery(this.prisma, query);
    return {
      ...result,
      data: await Promise.all(result.data.map((u) => this.toAdminUserDto(u))),
    };
  }

  async findUserById(id: string): Promise<AdminUserDto> {
    const user = await FindAdminUserByIdQuery(this.prisma, id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return this.toAdminUserDto(user);
  }

  async updateUser(id: string, dto: AdminUpdateUserDto): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found.`);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    if (dto.username && dto.username !== user.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (existing)
        throw new ConflictException('이미 사용 중인 사용자명입니다.');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.username !== undefined && { username: dto.username }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
    });

    return this.findUserById(id);
  }

  async suspendUser(
    requesterId: string,
    targetId: string,
    dto: SuspendUserDto,
  ): Promise<AdminUserDto> {
    if (requesterId === targetId) {
      throw new BadRequestException('자기 자신을 정지할 수 없습니다.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user)
      throw new NotFoundException(`User with ID ${targetId} not found.`);
    if (user.deletedAt) throw new BadRequestException('삭제된 사용자입니다.');

    const suspendedUntil = dto.days
      ? new Date(Date.now() + dto.days * 24 * 60 * 60 * 1000)
      : new Date('9999-12-31T23:59:59.999Z');

    await SuspendUserCommand(this.prisma, targetId, suspendedUntil);
    return this.findUserById(targetId);
  }

  async unsuspendUser(targetId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user)
      throw new NotFoundException(`User with ID ${targetId} not found.`);

    await UnsuspendUserCommand(this.prisma, targetId);
  }

  async deleteUser(requesterId: string, targetId: string): Promise<void> {
    if (requesterId === targetId) {
      throw new BadRequestException('자기 자신을 삭제할 수 없습니다.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user)
      throw new NotFoundException(`User with ID ${targetId} not found.`);
    if (user.deletedAt)
      throw new BadRequestException('이미 삭제된 사용자입니다.');

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId: targetId } });
      await tx.oAuthAccount.deleteMany({ where: { userId: targetId } });
      await tx.localCredential.deleteMany({ where: { userId: targetId } });
      await SoftDeleteUserCommand(tx, targetId);
    });
  }

  private async toAdminUserDto(
    user: AdminUserWithGroups,
  ): Promise<AdminUserDto> {
    let profileImageUrl: string | null = null;
    if (user.profileImagePath) {
      profileImageUrl = await this.storage.getFileUrl(user.profileImagePath);
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      profileImageUrl,
      suspendedUntil: user.suspendedUntil,
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      permissionGroups: user.permissionGroups.map((m) => ({
        id: m.permissionGroup.id,
        name: m.permissionGroup.name,
      })),
    };
  }
}
