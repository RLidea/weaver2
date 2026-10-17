/**
 * 인증 시도 잡기 — 실제 DB 에서 동시 요청이 잠금을 앞지르지 못하는지, 요소(PASSWORD ·
 * SECOND_FACTOR)가 서로 섞이지 않는지 잰다.
 *
 * 「확인 → 틀리면 +1」은 읽고-쓰기 사이에 동시 요청이 같은 값을 읽어 수백 번이 잠금 전에
 * 통과했다(IP 를 바꿔 가며 2FA 6자리 코드를 대입). 조건부 UPDATE 한 번으로 시도를 잡아,
 * 동시에 몇 개가 오든 한도(5)만큼만 통과해야 한다.
 */
import { PrismaService } from '@weaver2/prisma';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import {
  MAX_FAILED_ATTEMPTS,
  ReserveAuthAttemptCommand,
} from '../../src/core/auth/repositories/reserve-auth-attempt.command';
import { ResetAuthAttemptsCommand } from '../../src/core/auth/repositories/reset-auth-attempts.command';
import { OneTimeCodeService } from '../../src/core/auth/one-time-code/one-time-code.service';
import { ResetPasswordService } from '../../src/core/auth/services/reset-password.service';

describe('ReserveAuthAttemptCommand (Integration)', () => {
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
    const stamp = `${Date.now()}_${createdUserIds.length}`;
    const user = await prisma.user.create({
      data: {
        email: `attempt_${stamp}@integration-test.local`,
        username: `attempt_${stamp}`,
        displayName: `attempt ${stamp}`,
        emailVerifiedAt: new Date(),
        localCredential: { create: { passwordHash: 'x' } },
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  function lockoutOf(userId: string, factor: 'PASSWORD' | 'SECOND_FACTOR') {
    return prisma.authLockout.findUnique({
      where: { userId_factor: { userId, factor } },
    });
  }

  it('첫 시도에서 동시에 20번 잡아도 한도만큼만 통과하고 잠긴다 — 행이 없을 때도', async () => {
    const user = await createUser();

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        ReserveAuthAttemptCommand(prisma, user.id, 'PASSWORD'),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(MAX_FAILED_ATTEMPTS);
    const lockout = await lockoutOf(user.id, 'PASSWORD');
    expect(lockout?.failedAttempts).toBe(MAX_FAILED_ATTEMPTS);
    expect(lockout?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
  });

  it('잠금이 풀리면 카운터도 비워 다시 한도만큼 시도할 수 있다', async () => {
    const user = await createUser();
    await prisma.authLockout.create({
      data: {
        userId: user.id,
        factor: 'PASSWORD',
        failedAttempts: MAX_FAILED_ATTEMPTS,
        lockedUntil: new Date(Date.now() - 1000),
      },
    });

    await expect(
      ReserveAuthAttemptCommand(prisma, user.id, 'PASSWORD'),
    ).resolves.toBe(true);
    const lockout = await lockoutOf(user.id, 'PASSWORD');
    expect(lockout?.failedAttempts).toBe(1);
    expect(lockout?.lockedUntil).toBeNull();
  });

  it('요소는 따로 센다 — 비밀번호로 잠겨도 2FA 시도는 잡히고, 되돌림도 그 요소만', async () => {
    const user = await createUser();
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await ReserveAuthAttemptCommand(prisma, user.id, 'PASSWORD');
    }
    await ReserveAuthAttemptCommand(prisma, user.id, 'SECOND_FACTOR');

    expect(await ReserveAuthAttemptCommand(prisma, user.id, 'PASSWORD')).toBe(
      false,
    );
    expect(
      await ReserveAuthAttemptCommand(prisma, user.id, 'SECOND_FACTOR'),
    ).toBe(true);

    await ResetAuthAttemptsCommand(prisma, user.id, 'SECOND_FACTOR');
    expect(await lockoutOf(user.id, 'SECOND_FACTOR')).toBeNull();
    expect((await lockoutOf(user.id, 'PASSWORD'))?.lockedUntil).not.toBeNull();
  });

  it('재설정은 PASSWORD 잠금만 푼다 — SECOND_FACTOR 는 남는다', async () => {
    const user = await createUser();
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await ReserveAuthAttemptCommand(prisma, user.id, 'PASSWORD');
      await ReserveAuthAttemptCommand(prisma, user.id, 'SECOND_FACTOR');
    }
    const token = (await getTestingModule()
      .get(OneTimeCodeService)
      .issueLink(user.id, 'PASSWORD_RESET'))!;

    await getTestingModule()
      .get(ResetPasswordService)
      .execute({ token, password: 'NewPass1234!' });

    expect(await lockoutOf(user.id, 'PASSWORD')).toBeNull();
    const secondFactor = await lockoutOf(user.id, 'SECOND_FACTOR');
    expect(secondFactor?.failedAttempts).toBe(MAX_FAILED_ATTEMPTS);
    expect(secondFactor?.lockedUntil).not.toBeNull();
  });
});
