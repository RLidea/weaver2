/**
 * Two-Factor Methods Integration Tests
 *
 * 2FA 수단(two_factor_methods)의 조건부 쓰기가 「동시에 와도」 지켜지는지 실제 DB 로 잰다.
 * otplib 는 통합 시험에서 모의라, TOTP 코드 확인 대신 저장소 명령을 직접 부른다.
 */
import { PrismaService } from '@weaver2/prisma';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { ensureSystemPermissionGroups } from './helpers/permission-group.helper';
import { StartTotpSetupCommand } from '../../src/core/auth/repositories/start-totp-setup.command';
import { ConfirmTotpSetupCommand } from '../../src/core/auth/repositories/confirm-totp-setup.command';
import { RecordTotpTimeStepCommand } from '../../src/core/auth/repositories/record-totp-time-step.command';
import { DeleteTwoFactorMethodIfOtherRemainsCommand } from '../../src/core/auth/repositories/delete-two-factor-method-if-other-remains.command';
import { TwoFactorService } from '../../src/core/auth/services/two-factor.service';
import { UserAdminService } from '../../src/core/user/services/user-admin.service';
import { OneTimeCodeService } from '../../src/core/auth/one-time-code/one-time-code.service';

describe('Two-Factor Methods (Integration)', () => {
  let prisma: PrismaService;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    await ensureSystemPermissionGroups(prisma);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await closeTestApp();
  });

  async function createUser() {
    const name = `tfm_${Date.now()}_${createdUserIds.length}`;
    const user = await prisma.user.create({
      data: {
        email: `${name}@integration-test.local`,
        username: name,
        displayName: name,
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  async function totpRow(userId: string) {
    return prisma.twoFactorMethod.findUniqueOrThrow({
      where: { userId_kind: { userId, kind: 'TOTP' } },
    });
  }

  it('등록을 다시 시작하면 등록 중인 비밀만 덮고, 확인된 TOTP 는 덮지 못한다', async () => {
    const user = await createUser();
    expect(await StartTotpSetupCommand(prisma, user.id, 'v1:first')).toBe(true);
    expect(await StartTotpSetupCommand(prisma, user.id, 'v1:second')).toBe(
      true,
    );
    expect((await totpRow(user.id)).secretEncrypted).toBe('v1:second');

    expect(
      await ConfirmTotpSetupCommand(prisma, user.id, 'v1:second', 100),
    ).toBe(true);
    expect(await StartTotpSetupCommand(prisma, user.id, 'v1:third')).toBe(
      false,
    );

    const row = await totpRow(user.id);
    expect(row.secretEncrypted).toBe('v1:second');
    expect(row.confirmedAt).not.toBeNull();
    // 확인에 쓴 코드의 시간 단위가 남는다 — 그 코드로 곧바로 로그인하지 못한다
    expect(row.lastUsedTimeStep).toBe(100);
  });

  it('확인하는 사이 등록이 다시 시작됐으면 옛 비밀로는 켜지지 않는다', async () => {
    const user = await createUser();
    await StartTotpSetupCommand(prisma, user.id, 'v1:old');
    await StartTotpSetupCommand(prisma, user.id, 'v1:new');

    expect(await ConfirmTotpSetupCommand(prisma, user.id, 'v1:old', 1)).toBe(
      false,
    );
    expect((await totpRow(user.id)).confirmedAt).toBeNull();
  });

  it('같은 시간 단위를 동시에 두 번 남기려 하면 하나만 성공한다 — TOTP 재사용 차단', async () => {
    const user = await createUser();
    await StartTotpSetupCommand(prisma, user.id, 'v1:s');
    await ConfirmTotpSetupCommand(prisma, user.id, 'v1:s', 100);

    const results = await Promise.all([
      RecordTotpTimeStepCommand(prisma, user.id, 101),
      RecordTotpTimeStepCommand(prisma, user.id, 101),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('이미 쓴 단위 이하는 남기지 못한다', async () => {
    const user = await createUser();
    await StartTotpSetupCommand(prisma, user.id, 'v1:s');
    await ConfirmTotpSetupCommand(prisma, user.id, 'v1:s', 100);

    expect(await RecordTotpTimeStepCommand(prisma, user.id, 100)).toBe(false);
    expect(await RecordTotpTimeStepCommand(prisma, user.id, 99)).toBe(false);
    expect(await RecordTotpTimeStepCommand(prisma, user.id, 102)).toBe(true);
  });

  it('등록 중인(확인 전) TOTP 에는 시간 단위를 남기지 않는다', async () => {
    const user = await createUser();
    await StartTotpSetupCommand(prisma, user.id, 'v1:s');
    expect(await RecordTotpTimeStepCommand(prisma, user.id, 5)).toBe(false);
  });

  it('로컬 비밀번호가 없는 OAuth 사용자도 2FA 상태를 갖는다 — 수단은 사람에 붙는다', async () => {
    const user = await createUser();
    await prisma.twoFactorMethod.create({
      data: { userId: user.id, kind: 'EMAIL', confirmedAt: new Date() },
    });

    const status = await getTestingModule()
      .get(TwoFactorService)
      .getStatus(user.id);
    expect(status).toEqual({ totpEnabled: false, emailOtpEnabled: true });
  });

  describe('관리자 2FA 초기화', () => {
    it('2FA 수단·2FA 코드·2FA 잠금만 지우고, 재설정 링크와 비밀번호 잠금은 남긴다', async () => {
      const admin = await createUser();
      const user = await createUser();
      const codes = getTestingModule().get(OneTimeCodeService);
      await prisma.twoFactorMethod.createMany({
        data: [
          {
            userId: user.id,
            kind: 'TOTP',
            secretEncrypted: 'v1:s',
            confirmedAt: new Date(),
          },
          { userId: user.id, kind: 'EMAIL', confirmedAt: new Date() },
        ],
      });
      await codes.issueCode(user.id, 'STEP_UP');
      await codes.issueLink(user.id, 'PASSWORD_RESET');
      await prisma.authLockout.createMany({
        data: [
          { userId: user.id, factor: 'SECOND_FACTOR', failedAttempts: 3 },
          { userId: user.id, factor: 'PASSWORD', failedAttempts: 2 },
        ],
      });

      await getTestingModule()
        .get(UserAdminService)
        .resetTwoFactor(admin.id, user.id);

      expect(
        await prisma.twoFactorMethod.count({ where: { userId: user.id } }),
      ).toBe(0);
      const remainingCodes = await prisma.oneTimeCode.findMany({
        where: { userId: user.id },
        select: { purpose: true },
      });
      expect(remainingCodes).toEqual([{ purpose: 'PASSWORD_RESET' }]);
      const lockouts = await prisma.authLockout.findMany({
        where: { userId: user.id },
        select: { factor: true },
      });
      expect(lockouts).toEqual([{ factor: 'PASSWORD' }]);
    });

    it('자기 자신은 이 길로 초기화하지 못한다', async () => {
      const admin = await createUser();
      await expect(
        getTestingModule()
          .get(UserAdminService)
          .resetTwoFactor(admin.id, admin.id),
      ).rejects.toThrow(/설정 화면/);
    });
  });

  it('TOTP 해제와 이메일 해제가 동시에 와도 하나만 지워진다 — 2FA 가 0개가 되지 않는다', async () => {
    const user = await createUser();
    await prisma.twoFactorMethod.createMany({
      data: [
        {
          userId: user.id,
          kind: 'TOTP',
          secretEncrypted: 'v1:s',
          confirmedAt: new Date(),
        },
        { userId: user.id, kind: 'EMAIL', confirmedAt: new Date() },
      ],
    });

    const results = await Promise.all([
      DeleteTwoFactorMethodIfOtherRemainsCommand(prisma, user.id, 'TOTP'),
      DeleteTwoFactorMethodIfOtherRemainsCommand(prisma, user.id, 'EMAIL'),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(
      await prisma.twoFactorMethod.count({ where: { userId: user.id } }),
    ).toBe(1);
  });

  it('등록 중인 TOTP 는 「남는 다른 수단」으로 치지 않는다', async () => {
    const user = await createUser();
    await prisma.twoFactorMethod.createMany({
      data: [
        { userId: user.id, kind: 'TOTP', secretEncrypted: 'v1:s' },
        { userId: user.id, kind: 'EMAIL', confirmedAt: new Date() },
      ],
    });
    expect(
      await DeleteTwoFactorMethodIfOtherRemainsCommand(
        prisma,
        user.id,
        'EMAIL',
      ),
    ).toBe(false);
  });

  describe('관리자 상하 검사', () => {
    async function inGroup(name: string) {
      const user = await createUser();
      const group = await prisma.permissionGroup.findUniqueOrThrow({
        where: { name },
      });
      await prisma.userPermissionGroup.create({
        data: { userId: user.id, permissionGroupId: group.id },
      });
      return user;
    }

    it('Admin 은 SuperAdmin 의 2FA 를 초기화하지도, 이메일을 바꾸지도 못한다', async () => {
      const admin = await inGroup('Admin');
      const superAdmin = await inGroup('SuperAdmin');
      const service = getTestingModule().get(UserAdminService);

      await expect(
        service.resetTwoFactor(admin.id, superAdmin.id),
      ).rejects.toThrow(/권한이 넓은/);
      await expect(
        service.updateUser(admin.id, superAdmin.id, {
          email: `taken_${superAdmin.id}@integration-test.local`,
        }),
      ).rejects.toThrow(/권한이 넓은/);
      const after = await prisma.user.findUniqueOrThrow({
        where: { id: superAdmin.id },
      });
      expect(after.email).toBe(superAdmin.email);
    });

    it('SuperAdmin 은 Admin 의 2FA 를 초기화할 수 있다', async () => {
      const admin = await inGroup('Admin');
      const superAdmin = await inGroup('SuperAdmin');
      await prisma.twoFactorMethod.create({
        data: { userId: admin.id, kind: 'EMAIL', confirmedAt: new Date() },
      });

      await getTestingModule()
        .get(UserAdminService)
        .resetTwoFactor(superAdmin.id, admin.id);

      expect(
        await prisma.twoFactorMethod.count({ where: { userId: admin.id } }),
      ).toBe(0);
    });

    it('Admin 은 이메일 말고 다른 정보는 상위자라도 바꿀 수 있다(이메일만이 탈취 경로)', async () => {
      const admin = await inGroup('Admin');
      const superAdmin = await inGroup('SuperAdmin');
      await expect(
        getTestingModule()
          .get(UserAdminService)
          .updateUser(admin.id, superAdmin.id, {
            displayName: `renamed ${superAdmin.id}`,
          }),
      ).resolves.toBeDefined();
    });
  });
});
