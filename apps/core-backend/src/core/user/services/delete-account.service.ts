import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { SoftDeleteUserCommand } from '../repositories/soft-delete-user.command';
import { PermissionService } from '../../permission/services/permission.service';
import {
  USER_WITHDRAWAL_HOOKS,
  UserWithdrawalHook,
} from '../user-withdrawal-hooks';

@Injectable()
export class DeleteAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    // 탈퇴 정리 자리 (user-withdrawal-hooks.ts)
    @Optional()
    @Inject(USER_WITHDRAWAL_HOOKS)
    private readonly withdrawalHooks: UserWithdrawalHook[] = [],
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // 마지막 슈퍼관리자는 탈퇴하지 못한다 — 아무도 권한을 되돌려 줄 수 없게 된다
    await this.permissionService.withSuperAdminGuard(async (tx) => {
      // ON DELETE CASCADE fires only on hard DELETE, not on soft-delete (UPDATE).
      // Explicitly hard-delete auth-related records before soft-deleting the User.
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.oAuthAccount.deleteMany({ where: { userId } });
      await tx.localCredential.deleteMany({ where: { userId } });

      await SoftDeleteUserCommand(tx, userId);
      // 파생 프로젝트의 탈퇴 정리 (같은 트랜잭션)
      for (const hook of this.withdrawalHooks) await hook(tx, userId);
    });
  }
}
