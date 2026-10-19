import { Prisma, PrismaService } from '@weaver2/prisma';
import {
  BackchannelLogoutService,
  REVOKED_SID_TTL_MS,
} from './backchannel-logout.service';
import { OidcClient } from './oidc-client';
import {
  LOGOUT_TOKEN_MAX_AGE_SEC,
  LogoutTokenClaims,
  LogoutTokenError,
} from './oidc-logout-token';
import { OidcUserHooks } from './oidc-user-hooks';

const IAT = 1_800_000_000;

function p2002() {
  return new Prisma.PrismaClientKnownRequestError('dup', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('BackchannelLogoutService', () => {
  let tx: {
    $queryRaw: jest.Mock;
    oidcLogoutJti: { create: jest.Mock };
    oidcRevokedSid: { upsert: jest.Mock };
    refreshToken: { findMany: jest.Mock; deleteMany: jest.Mock };
    user: { findUnique: jest.Mock; update: jest.Mock };
  };
  let prisma: {
    oidcLogoutJti: { deleteMany: jest.Mock };
    oidcRevokedSid: { deleteMany: jest.Mock };
    user: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let verify: jest.Mock<Promise<LogoutTokenClaims>, [string]>;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn(),
      oidcLogoutJti: { create: jest.fn() },
      oidcRevokedSid: { upsert: jest.fn() },
      refreshToken: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    prisma = {
      oidcLogoutJti: { deleteMany: jest.fn() },
      oidcRevokedSid: { deleteMany: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    verify = jest.fn().mockResolvedValue({
      jti: 'j1',
      iat: IAT,
      sid: 'sid-1',
      sub: 'sub-1',
    });
  });

  const make = (hooks?: OidcUserHooks) =>
    new BackchannelLogoutService(
      prisma as unknown as PrismaService,
      { verifyLogoutToken: verify } as unknown as OidcClient,
      hooks,
    );

  it('sid(+sub) 의 세션 행을 지우고, jti 를 받아 주는 기간 끝 + 여유까지 남긴다', async () => {
    const result = await make().logout('token');
    expect(verify).toHaveBeenCalledWith('token');
    expect(tx.oidcLogoutJti.create).toHaveBeenCalledWith({
      data: {
        jti: 'j1',
        expiresAt: new Date((IAT + LOGOUT_TOKEN_MAX_AGE_SEC + 60 + 60) * 1000),
      },
    });
    // sid 와 sub 가 둘 다 오면 둘 다 맞는 행만 (L4)
    const where = { oidcSid: 'sid-1', user: { ssoSubject: 'sub-1' } };
    expect(tx.refreshToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where }) as object,
    );
    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({ where });
    expect(result).toEqual({
      userId: 'u1',
      meta: { sid: 'sid-1', sub: 'sub-1' },
      deleted: 2,
    });
  });

  it('기간이 지난 jti · 묘비는 지운다', async () => {
    await make().logout('token');
    const expired = { where: { expiresAt: { lt: expect.any(Date) as Date } } };
    expect(prisma.oidcLogoutJti.deleteMany).toHaveBeenCalledWith(expired);
    expect(prisma.oidcRevokedSid.deleteMany).toHaveBeenCalledWith(expired);
  });

  it('지우기 전에 세션 주인을 잠그고 sid 묘비를 31일 남긴다 — 경합한 회전이 남긴 행을 막는다', async () => {
    const before = Date.now();
    await make().logout('token');
    expect(tx.$queryRaw).toHaveBeenCalled();
    const upsert = tx.oidcRevokedSid.upsert.mock.calls[0][0] as {
      where: { sid: string };
      create: { sid: string; sub: string; expiresAt: Date };
    };
    expect(upsert.where).toEqual({ sid: 'sid-1' });
    expect(upsert.create).toMatchObject({ sid: 'sid-1', sub: 'sub-1' });
    expect(upsert.create.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + REVOKED_SID_TTL_MS,
    );
    // 잠금 → 묘비 → 지우기 순서
    const order = [
      tx.$queryRaw.mock.invocationCallOrder[0],
      tx.oidcRevokedSid.upsert.mock.invocationCallOrder[0],
      tx.refreshToken.deleteMany.mock.invocationCallOrder[0],
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('sid 만 오면 sid 로만 지운다', async () => {
    verify.mockResolvedValue({ jti: 'j3', iat: IAT, sid: 'sid-3' });
    await make().logout('token');
    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { oidcSid: 'sid-3' },
    });
  });

  it('같은 jti 가 다시 오면 LogoutTokenError — 세션을 다시 지우지 않는다', async () => {
    tx.oidcLogoutJti.create.mockRejectedValue(p2002());
    const err = await make()
      .logout('token')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LogoutTokenError);
    expect(tx.refreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it('검증에서 떨어지면 jti 도 세션도 건드리지 않는다', async () => {
    verify.mockRejectedValue(new LogoutTokenError('bad'));
    await expect(make().logout('token')).rejects.toBeInstanceOf(
      LogoutTokenError,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('DB 오류는 그대로 던진다(400 이 아니다 — 발급자가 다시 보낸다)', async () => {
    tx.refreshToken.deleteMany.mockRejectedValue(new Error('db down'));
    const err = await make()
      .logout('token')
      .catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(LogoutTokenError);
  });

  it('sid 로 지울 세션이 없으면 sub 로 사람만 찾아 훅에 넘긴다 — 그래도 성공', async () => {
    tx.refreshToken.findMany.mockResolvedValue([]);
    tx.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
    prisma.user.findUnique.mockResolvedValue({ id: 'u9' });
    await expect(make().logout('token')).resolves.toMatchObject({
      userId: 'u9',
      deleted: 0,
    });
  });

  it('아무도 못 찾으면 userId null', async () => {
    tx.refreshToken.findMany.mockResolvedValue([]);
    tx.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
    await expect(make().logout('token')).resolves.toMatchObject({
      userId: null,
      deleted: 0,
    });
  });

  it('sid 없이 sub 만이면(session_required=false) 그 사람의 세션을 모두 지운다', async () => {
    verify.mockResolvedValue({ jti: 'j2', iat: IAT, sub: 'sub-2' });
    tx.user.findUnique.mockResolvedValue({ id: 'u2' });
    tx.refreshToken.deleteMany.mockResolvedValue({ count: 3 });
    await expect(make().logout('token')).resolves.toEqual({
      userId: 'u2',
      meta: { sid: undefined, sub: 'sub-2' },
      deleted: 3,
    });
    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { ssoSubject: 'sub-2' },
      select: { id: true },
    });
    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u2' },
    });
    // 그 시각보다 먼저 만든 행은 회전하지 못한다
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u2' },
      data: { sessionsRevokedAt: expect.any(Date) as Date },
    });
  });

  it('afterLogout 은 onBackchannelLogout(userId, { sid, sub }) 을 부르고, 훅이 던져도 삼킨다', async () => {
    const onBackchannelLogout = jest.fn().mockRejectedValue(new Error('boom'));
    const service = make({ onBackchannelLogout });
    const result = await service.logout('token');
    await expect(service.afterLogout(result)).resolves.toBeUndefined();
    expect(onBackchannelLogout).toHaveBeenCalledWith('u1', {
      sid: 'sid-1',
      sub: 'sub-1',
    });
  });

  it('훅이 없어도 된다', async () => {
    const service = make();
    await expect(
      service.afterLogout(await service.logout('token')),
    ).resolves.toBeUndefined();
  });
});
