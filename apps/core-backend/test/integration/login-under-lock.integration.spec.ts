/**
 * 로그인을 사용자 행 잠금 아래로 (Integration) — 비밀번호 변경과 겹친 옛 비밀번호의 로그인이 세션을 남기지 않는가.
 *
 * 로그인은 비밀번호를 잠금 밖에서 맞춰 보고(bcrypt), 세션은 잠금 아래에서 준다. 그 사이 비밀번호가 바뀌었으면
 * 맞춰 본 비밀번호의 passwordChangedAt 이 달라져 거절한다 (SignInService.login).
 * 비밀번호 변경 · 재설정도 같은 행을 잠근 채 커밋하므로, 로그인이 잠금을 얻은 뒤 다시 읽는 값은 늘 커밋된 최신 값이다.
 */
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { ChangePasswordService } from '../../src/core/user/services/change-password.service';
import {
  passwordHashFingerprint,
  SignInProof,
  SignInService,
} from '../../src/core/auth/services/sign-in.service';
import { LockUsersCommand } from '../../src/core/auth/repositories/lock-users.command';
import { UpdateLocalCredentialPasswordCommand } from '../../src/core/auth/repositories/update-local-credential-password.command';
import { DeleteRefreshTokensByUserIdCommand } from '../../src/core/auth/repositories/delete-refresh-tokens-by-user-id.command';

const PASSWORDS = ['OldPass1234!', 'NewPass1234!'] as const;

describe('로그인을 사용자 행 잠금 아래로 — 비밀번호 변경과 겹쳐도 옛 비밀번호의 세션이 남지 않는다 (Integration)', () => {
  let prisma: PrismaService;
  let signIn: SignInService;
  let changePassword: ChangePasswordService;
  const userIds: string[] = [];
  const tag = `${Date.now()}`;

  beforeAll(async () => {
    await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    signIn = getTestingModule().get(SignInService);
    changePassword = getTestingModule().get(ChangePasswordService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await closeTestApp();
  });

  async function passwordUser(name: string) {
    const email = `ll_${name}_${tag}@integration-test.local`;
    const user = await prisma.user.create({
      data: {
        email,
        username: `ll_${name}_${tag}`,
        displayName: `ll_${name}_${tag}`,
        emailVerifiedAt: new Date(),
        localCredential: {
          create: { passwordHash: await bcrypt.hash(PASSWORDS[0], 4) },
        },
      },
    });
    userIds.push(user.id);
    return { ...user, email };
  }

  /** 로그인 화면이 하는 첫 단계 — 비밀번호를 맞춰 보고, 맞춰 본 그 비밀번호의 확인을 쥔다 (LocalStrategy 와 같다) */
  async function verify(email: string, password: string): Promise<SignInProof> {
    const user = await signIn.validateUserByEmail(email, password);
    const credential = user.localCredential!;
    return {
      kind: 'password',
      changedAtMs: credential.passwordChangedAt.getTime(),
      hashFingerprint: passwordHashFingerprint(credential.passwordHash),
    };
  }

  const loginWith = (
    userId: string,
    proof: SignInProof,
    afterTwoFactor = false,
  ) =>
    signIn.login(userId, 'email', false, undefined, undefined, undefined, {
      ...proof,
      afterTwoFactor,
    });

  const refreshTokens = (userId: string) =>
    prisma.refreshToken.count({ where: { userId } });

  it('맞춰 본 뒤 비밀번호가 바뀌었으면 세션을 주지 않는다 — 비밀번호 길은 「잘못된 자격 증명」, 2FA 길은 「pre-auth 가 낡았다」', async () => {
    const user = await passwordUser('seq');
    const proof = await verify(user.email, PASSWORDS[0]);

    await changePassword.changePassword(user.id, {
      currentPassword: PASSWORDS[0],
      newPassword: PASSWORDS[1],
    });

    await expect(loginWith(user.id, proof)).rejects.toThrow(
      'Invalid credentials',
    );
    await expect(loginWith(user.id, proof, true)).rejects.toThrow(
      'Invalid or expired pre-auth token',
    );
    expect(await refreshTokens(user.id)).toBe(0);

    // 새 비밀번호로 맞춰 보면 들어간다
    await loginWith(user.id, await verify(user.email, PASSWORDS[1]));
    expect(await refreshTokens(user.id)).toBe(1);
  });

  /*
    순서를 손으로 만든다:
      1. 변경 트랜잭션이 사용자 행을 잠그고 새 해시를 쓰고 토큰을 지운다 (아직 커밋 전)
      2. 로그인이 옛 해시를 읽는다(커밋 전이라 옛 값이 보인다)
      3. 로그인이 사용자 행 잠금에서 기다린다 — 맞춰 보는 도중 시도 잡기 행(auth_lockouts)을 넣으며
         외래 키로 한 번, 세션을 주려고 한 번. 어느 쪽이든 변경이 커밋할 때까지다
      4. 변경이 커밋한다 → 옛 비밀번호는 옛 해시와 맞지만, 로그인이 잠금 아래에서 다시 읽은
         passwordChangedAt 은 바뀌었다 → 거절
    잠금 · 견주기가 없으면 4 뒤에 바로 토큰을 넣고, 변경의 지우기는 이미 지난 뒤라 그 토큰이 남는다.
  */
  it('변경 트랜잭션이 커밋하기 전에 옛 비밀번호를 맞춰 본 로그인도 — 잠금을 기다렸다가 거절된다', async () => {
    const user = await passwordUser('order');
    const newHash = await bcrypt.hash(PASSWORDS[1], 4);

    let blockerPid = 0;
    const waitingOnBlocker = async () => {
      const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM pg_stat_activity
        WHERE ${blockerPid}::int = ANY(pg_blocking_pids(pid))`;
      return n;
    };

    let logging!: Promise<PromiseSettledResult<unknown>>;
    await prisma.$transaction(
      async (tx) => {
        // 1. 비밀번호 변경과 같은 순서 (ChangePasswordService)
        await LockUsersCommand(tx, [user.id]);
        await UpdateLocalCredentialPasswordCommand(tx, user.id, newHash);
        await DeleteRefreshTokensByUserIdCommand(tx, user.id);
        [{ pid: blockerPid }] = await tx.$queryRaw<{ pid: number }[]>`
          SELECT pg_backend_pid() AS pid`;

        // 2 · 3. 옛 해시를 읽고 맞춰 본 뒤 세션을 받으러 간다 — 잠금에서 기다린다
        logging = verify(user.email, PASSWORDS[0])
          .then((proof) => loginWith(user.id, proof))
          .then(
            (value) => ({ status: 'fulfilled', value }),
            (reason: unknown) => ({ status: 'rejected', reason }),
          );
        for (let i = 0; i < 200 && (await waitingOnBlocker()) < 1; i++)
          await new Promise((r) => setTimeout(r, 10));
        expect(await waitingOnBlocker()).toBe(1);
      },
      { timeout: 10_000 },
    );

    // 4. 커밋 뒤 — 로그인은 바뀐 passwordChangedAt 을 보고 거절한다
    const result = await logging;
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.reason).toEqual(
        new UnauthorizedException('Invalid credentials'),
      );
    }
    expect(await refreshTokens(user.id)).toBe(0);
  });

  /*
    실제로 둘을 한꺼번에 띄운다. 어느 쪽이 먼저 잠금을 얻든 — 로그인이 먼저면 변경이 그 토큰을 지우고,
    변경이 먼저면 로그인이 거절된다 — 판이 끝나면 refresh 토큰이 하나도 남지 않아야 한다.
    변경은 잠그기 전에 bcrypt 를 두 번 돈다(현재 비밀번호 확인 · 새 해시) — 짝수 판은 둘을 바로 띄워 로그인이
    대개 먼저, 홀수 판은 로그인을 20~180ms 늦춰 변경의 앞뒤를 고루 밟게 한다.
    어느 순서가 나올지는 기계 속도에 달려 두 순서가 다 나왔는지는 묻지 않는다 — 순서는 위 시험이 손으로 만들어 잰다.
  */
  it('옛 비밀번호의 로그인과 비밀번호 변경을 한꺼번에 띄워도 판마다 refresh 토큰이 남지 않는다 — 교착도 없다', async () => {
    const user = await passwordUser('race');

    for (let round = 0; round < 20; round++) {
      const current = PASSWORDS[round % 2];
      const next = PASSWORDS[(round + 1) % 2];
      const proof = await verify(user.email, current);

      const loginDelay = round % 2 ? 20 * (round % 10) : 0;
      const [loggedIn, changed] = await Promise.allSettled([
        new Promise((r) => setTimeout(r, loginDelay)).then(() =>
          loginWith(user.id, proof),
        ),
        changePassword.changePassword(user.id, {
          currentPassword: current,
          newPassword: next,
        }),
      ]);

      expect(changed.status).toBe('fulfilled');
      if (loggedIn.status === 'rejected') {
        expect(loggedIn.reason).toBeInstanceOf(UnauthorizedException);
      }
      expect(await refreshTokens(user.id)).toBe(0);
    }
  });

  it('OAuth · SSO — 잠금 아래에서 연동이 아직 있는지 실제 DB 로 본다 (재설정이 연동을 끊고 · 연결 해제가 sub 를 풀면 거절)', async () => {
    const user = await passwordUser('links');
    await prisma.oAuthAccount.create({
      data: { userId: user.id, provider: 'google', providerId: `g_${tag}` },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { ssoSubject: `sub_${tag}` },
    });
    const oauth = {
      kind: 'oauth',
      provider: 'google',
      providerId: `g_${tag}`,
    } as const;
    const sso = { kind: 'sso', sub: `sub_${tag}` } as const;

    await loginWith(user.id, oauth);
    await loginWith(user.id, sso);
    expect(await refreshTokens(user.id)).toBe(2);

    // 재설정이 미인증 계정에서 하는 것 · SSO 연결 해제가 하는 것과 같은 끝 상태
    await prisma.oAuthAccount.deleteMany({ where: { userId: user.id } });
    await prisma.user.update({
      where: { id: user.id },
      data: { ssoSubject: null },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    await expect(loginWith(user.id, oauth)).rejects.toThrow(
      'Invalid credentials',
    );
    await expect(loginWith(user.id, sso)).rejects.toThrow(
      'Invalid credentials',
    );
    expect(await refreshTokens(user.id)).toBe(0);
  });

  it('OAuth — 재설정이 선점자의 연동을 끊고 주인이 같은 공급자를 새로 이었어도, 선점자의 로그인은 거절된다', async () => {
    const user = await passwordUser('relink');
    const squatter = {
      kind: 'oauth',
      provider: 'google',
      providerId: `g_squatter_${tag}`,
    } as const;
    await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: 'google',
        providerId: squatter.providerId,
      },
    });

    // 선점자의 콜백은 끝났고 세션을 받기 전 — 그 사이 재설정이 연동을 끊고, 주인이 자기 google 을 잇는다
    await prisma.oAuthAccount.deleteMany({ where: { userId: user.id } });
    await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: 'google',
        providerId: `g_owner_${tag}`,
      },
    });

    await expect(loginWith(user.id, squatter)).rejects.toThrow(
      'Invalid credentials',
    );
    expect(await refreshTokens(user.id)).toBe(0);
  });
});
