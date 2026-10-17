/**
 * 로그인 시도 잡기 — 실제 DB 에서 동시 요청이 잠금을 앞지르지 못하는지 잰다.
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
  ReserveLoginAttemptCommand,
} from '../../src/core/auth/repositories/reserve-login-attempt.command';

describe('ReserveLoginAttemptCommand (Integration)', () => {
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
        localCredential: { create: { password: 'x' } },
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  it('동시에 20번 잡아도 한도만큼만 통과하고 잠긴다', async () => {
    const user = await createUser();

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        ReserveLoginAttemptCommand(prisma, user.id),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(MAX_FAILED_ATTEMPTS);
    const credential = await prisma.localCredential.findUnique({
      where: { userId: user.id },
    });
    expect(credential?.failedAttempts).toBe(MAX_FAILED_ATTEMPTS);
    expect(credential?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
  });

  it('잠금이 풀리면 카운터도 비워 다시 한도만큼 시도할 수 있다', async () => {
    const user = await createUser();
    await prisma.localCredential.update({
      where: { userId: user.id },
      data: {
        failedAttempts: MAX_FAILED_ATTEMPTS,
        lockedUntil: new Date(Date.now() - 1000),
      },
    });

    await expect(ReserveLoginAttemptCommand(prisma, user.id)).resolves.toBe(
      true,
    );
    const credential = await prisma.localCredential.findUnique({
      where: { userId: user.id },
    });
    expect(credential?.failedAttempts).toBe(1);
    expect(credential?.lockedUntil).toBeNull();
  });
});
