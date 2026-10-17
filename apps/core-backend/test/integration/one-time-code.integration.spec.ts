/**
 * One-Time Code Integration Tests
 *
 * 일회용 비밀의 한도·유예·소비가 「동시에 와도」 지켜지는지 실제 DB 로 잰다.
 * 단위 테스트의 모의 DB 로는 조건부 UPDATE·DELETE 의 원자성을 볼 수 없다.
 */
import { PrismaService } from '@weaver2/prisma';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { OneTimeCodeService } from '../../src/core/auth/one-time-code/one-time-code.service';
import { MAX_CODE_ATTEMPTS } from '../../src/core/auth/one-time-code/one-time-code.constants';
import { UpsertOneTimeCodeCommand } from '../../src/core/auth/one-time-code/repositories/upsert-one-time-code.command';
import { ReserveOneTimeCodeAttemptCommand } from '../../src/core/auth/one-time-code/repositories/reserve-one-time-code-attempt.command';
import { UpdateUserEmailCommand } from '../../src/core/user/repositories/update-user-email.command';
import { SoftDeleteUserCommand } from '../../src/core/user/repositories/soft-delete-user.command';
import { UserAdminService } from '../../src/core/user/services/user-admin.service';

describe('One-Time Code (Integration)', () => {
  let prisma: PrismaService;
  let service: OneTimeCodeService;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    service = getTestingModule().get(OneTimeCodeService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await closeTestApp();
  });

  async function createUser() {
    const name = `otc_${Date.now()}_${createdUserIds.length}`;
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

  /** 재발급 유예를 기다리지 않고 지나간 것으로 만든다 */
  async function ageCode(userId: string, ms: number) {
    const row = await prisma.oneTimeCode.findFirstOrThrow({
      where: { userId },
    });
    await prisma.oneTimeCode.update({
      where: { id: row.id },
      data: { createdAt: new Date(row.createdAt.getTime() - ms) },
    });
  }

  function wrongCodeOf(code: string) {
    return code === '000000' ? '000001' : '000000';
  }

  describe('6자리 코드', () => {
    it('맞는 코드는 한 번만 통과하고 소비된다', async () => {
      const user = await createUser();
      const code = (await service.issueCode(user.id, 'STEP_UP'))!;

      expect(await service.verifyCode(user.id, 'STEP_UP', code)).toEqual({
        newEmail: null,
      });
      expect(await service.verifyCode(user.id, 'STEP_UP', code)).toBeNull();
    });

    it('틀린 코드 20번을 동시에 쏴도 시도는 5번까지만 잡힌다 — 그 뒤엔 맞는 코드도 거절', async () => {
      const user = await createUser();
      const code = (await service.issueCode(user.id, 'TWO_FACTOR_LOGIN'))!;

      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          service.verifyCode(user.id, 'TWO_FACTOR_LOGIN', wrongCodeOf(code)),
        ),
      );
      expect(results.every((r) => r === null)).toBe(true);

      const row = await prisma.oneTimeCode.findFirstOrThrow({
        where: { userId: user.id },
      });
      expect(row.attempts).toBe(MAX_CODE_ATTEMPTS);
      expect(
        await service.verifyCode(user.id, 'TWO_FACTOR_LOGIN', code),
      ).toBeNull();
    });

    it('같은 맞는 코드를 동시에 두 번 내면 하나만 통과한다', async () => {
      const user = await createUser();
      const code = (await service.issueCode(user.id, 'STEP_UP'))!;

      const results = await Promise.all([
        service.verifyCode(user.id, 'STEP_UP', code),
        service.verifyCode(user.id, 'STEP_UP', code),
      ]);
      expect(results.filter((r) => r !== null)).toHaveLength(1);
    });

    it('유예(60초) 안에는 다시 받을 수 없다', async () => {
      const user = await createUser();
      expect(await service.issueCode(user.id, 'STEP_UP')).not.toBeNull();
      expect(await service.issueCode(user.id, 'STEP_UP')).toBeNull();
    });

    it('재발급해도 시도 횟수는 그대로다 — 옛 코드는 무효', async () => {
      const user = await createUser();
      const first = (await service.issueCode(user.id, 'STEP_UP'))!;
      for (let i = 0; i < 3; i++) {
        await service.verifyCode(user.id, 'STEP_UP', wrongCodeOf(first));
      }
      await ageCode(user.id, 61_000);

      const second = await service.issueCode(user.id, 'STEP_UP');
      expect(second).not.toBeNull();
      const row = await prisma.oneTimeCode.findFirstOrThrow({
        where: { userId: user.id },
      });
      expect(row.attempts).toBe(3);
      if (first !== second) {
        expect(await service.verifyCode(user.id, 'STEP_UP', first)).toBeNull();
      }
    });

    it('시도를 다 쓴 코드는 만료될 때까지 새로 받을 수 없고, 만료되면 0 부터 다시', async () => {
      const user = await createUser();
      const code = (await service.issueCode(user.id, 'STEP_UP'))!;
      for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
        await service.verifyCode(user.id, 'STEP_UP', wrongCodeOf(code));
      }
      await ageCode(user.id, 61_000);
      expect(await service.issueCode(user.id, 'STEP_UP')).toBeNull();

      await prisma.oneTimeCode.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const fresh = (await service.issueCode(user.id, 'STEP_UP'))!;
      expect(fresh).not.toBeNull();
      expect(
        await service.verifyCode(user.id, 'STEP_UP', fresh),
      ).not.toBeNull();
    });

    it('이메일 변경 코드는 새 주소를 돌려준다', async () => {
      const user = await createUser();
      const code = (await service.issueCode(user.id, 'EMAIL_CHANGE', {
        newEmail: 'next@integration-test.local',
      }))!;
      expect(await service.verifyCode(user.id, 'EMAIL_CHANGE', code)).toEqual({
        newEmail: 'next@integration-test.local',
      });
    });

    it('목적이 다르면 같은 코드라도 통과하지 않는다', async () => {
      const user = await createUser();
      const code = (await service.issueCode(user.id, 'STEP_UP'))!;
      expect(
        await service.verifyCode(user.id, 'TWO_FACTOR_SETUP', code),
      ).toBeNull();
    });
  });

  describe('링크', () => {
    it('주인 보기는 소비하지 않고, 소비는 한 번뿐이다', async () => {
      const user = await createUser();
      const token = (await service.issueLink(user.id, 'PASSWORD_RESET'))!;

      expect(await service.findLinkOwner(token, 'PASSWORD_RESET')).toBe(
        user.id,
      );
      expect(await service.consumeLink(token, 'PASSWORD_RESET')).toBe(user.id);
      expect(await service.consumeLink(token, 'PASSWORD_RESET')).toBeNull();
    });

    it('같은 링크를 동시에 두 번 내면 하나만 주인을 받는다', async () => {
      const user = await createUser();
      const token = (await service.issueLink(user.id, 'EMAIL_VERIFICATION'))!;

      const results = await Promise.all([
        service.consumeLink(token, 'EMAIL_VERIFICATION'),
        service.consumeLink(token, 'EMAIL_VERIFICATION'),
      ]);
      expect(results.filter((r) => r === user.id)).toHaveLength(1);
    });

    it('목적이 다르면 통과하지 않는다', async () => {
      const user = await createUser();
      const token = (await service.issueLink(user.id, 'PASSWORD_RESET'))!;
      expect(await service.consumeLink(token, 'EMAIL_VERIFICATION')).toBeNull();
    });

    it('유예(10분) 안에는 다시 받을 수 없다', async () => {
      const user = await createUser();
      expect(await service.issueLink(user.id, 'PASSWORD_RESET')).not.toBeNull();
      expect(await service.issueLink(user.id, 'PASSWORD_RESET')).toBeNull();
    });

    it('만료된 링크는 통과하지 않는다', async () => {
      const user = await createUser();
      const token = (await service.issueLink(user.id, 'PASSWORD_RESET'))!;
      await prisma.oneTimeCode.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      expect(await service.findLinkOwner(token, 'PASSWORD_RESET')).toBeNull();
      expect(await service.consumeLink(token, 'PASSWORD_RESET')).toBeNull();
    });
  });

  it('정리는 만료된 것만 지운다', async () => {
    const live = await createUser();
    const dead = await createUser();
    await service.issueCode(live.id, 'STEP_UP');
    await service.issueCode(dead.id, 'STEP_UP');
    await prisma.oneTimeCode.updateMany({
      where: { userId: dead.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await service.purgeExpired();

    expect(await prisma.oneTimeCode.count({ where: { userId: live.id } })).toBe(
      1,
    );
    expect(await prisma.oneTimeCode.count({ where: { userId: dead.id } })).toBe(
      0,
    );
  });

  describe('리뷰 보강', () => {
    it('만료된 6자리 코드는 시도조차 잡히지 않는다', async () => {
      const user = await createUser();
      const code = (await service.issueCode(user.id, 'STEP_UP'))!;
      await prisma.oneTimeCode.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      expect(await service.verifyCode(user.id, 'STEP_UP', code)).toBeNull();
      const row = await prisma.oneTimeCode.findFirstOrThrow({
        where: { userId: user.id },
      });
      expect(row.attempts).toBe(0);
    });

    it('유예 중 재발급은 저장된 코드·새 주소를 바꾸지 않는다', async () => {
      const user = await createUser();
      await service.issueCode(user.id, 'EMAIL_CHANGE', {
        newEmail: 'first@integration-test.local',
      });
      const before = await prisma.oneTimeCode.findFirstOrThrow({
        where: { userId: user.id },
      });

      expect(
        await service.issueCode(user.id, 'EMAIL_CHANGE', {
          newEmail: 'second@integration-test.local',
        }),
      ).toBeNull();
      const after = await prisma.oneTimeCode.findFirstOrThrow({
        where: { userId: user.id },
      });
      expect(after.secretHash).toBe(before.secretHash);
      expect(after.newEmail).toBe('first@integration-test.local');
    });

    it.each(['Asia/Seoul', 'America/Los_Angeles', 'UTC'])(
      'DB 세션 시간대(%s)와 무관하게 만료를 판단한다 — 시각은 앱이 UTC 로 넘긴다',
      async (zone) => {
        const user = await createUser();
        await prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL TIME ZONE '${zone}'`);
          const now = new Date();
          await UpsertOneTimeCodeCommand(tx, {
            userId: user.id,
            purpose: 'STEP_UP',
            secretHash: `tz-${zone}-${user.id}`,
            newEmail: null,
            now,
            expiresAt: new Date(now.getTime() + 5 * 60_000),
            cooldownMs: 60_000,
          });
          // 5분 뒤 만료 — 살아 있어야 한다
          expect(
            await ReserveOneTimeCodeAttemptCommand(tx, user.id, 'STEP_UP', now),
          ).not.toBeNull();
          // 10분 뒤 시각으로 보면 만료여야 한다
          expect(
            await ReserveOneTimeCodeAttemptCommand(
              tx,
              user.id,
              'STEP_UP',
              new Date(now.getTime() + 10 * 60_000),
            ),
          ).toBeNull();
        });
      },
    );

    it('메일 발송이 실패하면 발급을 거둬, 유예에 걸리지 않고 바로 다시 받을 수 있다', async () => {
      const user = await createUser();
      await service.issueCode(user.id, 'STEP_UP');
      const boom = new Error('smtp down');

      await expect(
        service.deliverOrRevoke(user.id, 'STEP_UP', () => Promise.reject(boom)),
      ).rejects.toBe(boom);
      expect(
        await prisma.oneTimeCode.count({ where: { userId: user.id } }),
      ).toBe(0);
      expect(await service.issueCode(user.id, 'STEP_UP')).not.toBeNull();
    });

    it('본인이 이메일을 바꾸면 인증 시각을 새로 정하고 옛 주소로 나간 링크를 버린다', async () => {
      const user = await createUser();
      const reset = (await service.issueLink(user.id, 'PASSWORD_RESET'))!;
      await service.issueCode(user.id, 'STEP_UP');

      await UpdateUserEmailCommand(
        prisma,
        user.id,
        `moved_${user.id}@integration-test.local`,
      );

      expect(await service.findLinkOwner(reset, 'PASSWORD_RESET')).toBeNull();
      // 링크가 아닌 코드는 건드리지 않는다
      expect(
        await prisma.oneTimeCode.count({
          where: { userId: user.id, purpose: 'STEP_UP' },
        }),
      ).toBe(1);
      const moved = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(moved.emailVerifiedAt).not.toBeNull();
    });

    it('관리자가 이메일을 바꾸면 인증을 풀고 옛 주소로 나간 링크를 버린다', async () => {
      const user = await createUser();
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
      const reset = (await service.issueLink(user.id, 'PASSWORD_RESET'))!;

      await getTestingModule()
        .get(UserAdminService)
        .updateUser(user.id, {
          email: `admin_set_${user.id}@integration-test.local`,
        });

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.emailVerifiedAt).toBeNull();
      expect(await service.findLinkOwner(reset, 'PASSWORD_RESET')).toBeNull();
    });

    it('관리자가 이메일 말고 다른 것만 바꾸면 인증은 그대로다', async () => {
      const user = await createUser();
      const verifiedAt = new Date();
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: verifiedAt },
      });

      await getTestingModule()
        .get(UserAdminService)
        .updateUser(user.id, {
          email: user.email,
          displayName: `renamed ${user.id}`,
        });

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.emailVerifiedAt).not.toBeNull();
    });

    it('탈퇴하면 일회용 비밀이 남지 않는다', async () => {
      const user = await createUser();
      await service.issueCode(user.id, 'STEP_UP');
      await service.issueLink(user.id, 'PASSWORD_RESET');

      await SoftDeleteUserCommand(prisma, user.id);

      expect(
        await prisma.oneTimeCode.count({ where: { userId: user.id } }),
      ).toBe(0);
    });
  });
});
