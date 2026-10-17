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
import { StartTotpSetupCommand } from '../../src/core/auth/repositories/start-totp-setup.command';
import { ConfirmTotpSetupCommand } from '../../src/core/auth/repositories/confirm-totp-setup.command';
import { RecordTotpTimeStepCommand } from '../../src/core/auth/repositories/record-totp-time-step.command';
import { TwoFactorService } from '../../src/core/auth/services/two-factor.service';

describe('Two-Factor Methods (Integration)', () => {
  let prisma: PrismaService;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    await createTestApp();
    prisma = getTestingModule().get(PrismaService);
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
});
