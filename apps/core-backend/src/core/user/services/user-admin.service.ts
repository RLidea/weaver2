import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
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
import { DeleteRefreshTokensByUserIdCommand } from '../../auth/repositories/delete-refresh-tokens-by-user-id.command';
import { normalizeEmail } from '../../auth/utils/email.util';

@Injectable()
export class UserAdminService {
  private readonly logger = new Logger(UserAdminService.name);

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
        where: { email: normalizeEmail(dto.email) },
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

    // 관리자는 새 주소의 주인임을 증명하지 못한다 — 인증을 풀고, 옛 주소로 나간 링크를
    // 버린다. 사용자는 인증 메일 재발송으로 다시 증명한다.
    const emailChanged =
      dto.email !== undefined && normalizeEmail(dto.email) !== user.email;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.displayName !== undefined && {
            displayName: dto.displayName,
          }),
          ...(dto.username !== undefined && { username: dto.username }),
          ...(dto.email !== undefined && { email: normalizeEmail(dto.email) }),
          ...(emailChanged && { emailVerifiedAt: null }),
        },
      }),
      ...(emailChanged
        ? [
            this.prisma.oneTimeCode.deleteMany({
              where: {
                userId: id,
                purpose: { in: ['PASSWORD_RESET', 'EMAIL_VERIFICATION'] },
              },
            }),
          ]
        : []),
    ]);

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

    /*
      **정지는 「지금부터 못 쓴다」는 뜻이어야 한다.**

      그러려면 세 겹이 다 필요하다:
      1. 새 로그인 차단 — `sign-in.service.ts` (기존)
      2. **이미 발급된 access token 차단** — `jwt.strategy.validate()` 가 정지를 본다
      3. 세션 회수 — 여기

      3만으로는 부족하다. refresh 를 지워도 브라우저에 남은 access token 이 만료
      (기본 1시간)까지 통해서, 정지당한 사람이 열어둔 탭으로 계속 일한다. 2가 그걸
      막고, 3은 **갱신으로 되살아나는 길**을 끊는다.
    */
    await DeleteRefreshTokensByUserIdCommand(this.prisma, targetId);

    return this.findUserById(targetId);
  }

  async unsuspendUser(targetId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user)
      throw new NotFoundException(`User with ID ${targetId} not found.`);

    await UnsuspendUserCommand(this.prisma, targetId);
  }

  /**
   * 사용자의 2FA 를 초기화한다 — 인증 앱을 잃은 사용자의 복구 길. OAuth 사용자까지 2FA 를
   * 켤 수 있게 되어 미루지 않는다. 수단·살아 있던 2FA 코드·2FA 잠금을 함께 지운다.
   *
   * 관리자 행동을 남기는 감사 테이블은 아직 없어, 누가 누구를 초기화했는지 서버 로그에 남긴다.
   * 자기 자신은 막는다 — 관리자 세션만 가진 사람이 제 2FA 를 이 길로 벗기지 못하게
   * (본인은 코드를 요구하는 일반 해제를 쓴다).
   */
  async resetTwoFactor(requesterId: string, targetId: string): Promise<void> {
    if (requesterId === targetId) {
      throw new BadRequestException(
        '자기 자신의 2단계 인증은 설정 화면에서 해제하세요.',
      );
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user)
      throw new NotFoundException(`User with ID ${targetId} not found.`);

    await this.prisma.$transaction([
      this.prisma.twoFactorMethod.deleteMany({ where: { userId: targetId } }),
      this.prisma.oneTimeCode.deleteMany({
        where: {
          userId: targetId,
          purpose: { in: ['TWO_FACTOR_LOGIN', 'TWO_FACTOR_SETUP', 'STEP_UP'] },
        },
      }),
      this.prisma.authLockout.deleteMany({
        where: { userId: targetId, factor: 'SECOND_FACTOR' },
      }),
    ]);
    this.logger.warn(
      `2FA reset by admin: requesterId=${requesterId} targetId=${targetId}`,
    );
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
