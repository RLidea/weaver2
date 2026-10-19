import { Prisma, PrismaService } from '@weaver2/prisma';
import { BackchannelLogoutService } from './backchannel-logout.service';
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
    oidcLogoutJti: { create: jest.Mock };
    refreshToken: { findMany: jest.Mock; deleteMany: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let prisma: {
    oidcLogoutJti: { deleteMany: jest.Mock };
    user: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let verify: jest.Mock<Promise<LogoutTokenClaims>, [string]>;

  beforeEach(() => {
    tx = {
      oidcLogoutJti: { create: jest.fn() },
      refreshToken: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    prisma = {
      oidcLogoutJti: { deleteMany: jest.fn() },
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

  it('sid 로 그 세션 행을 모두 지우고, jti 를 받아 주는 기간 끝까지 남긴다', async () => {
    const result = await make().logout('token');
    expect(verify).toHaveBeenCalledWith('token');
    expect(tx.oidcLogoutJti.create).toHaveBeenCalledWith({
      data: {
        jti: 'j1',
        expiresAt: new Date((IAT + LOGOUT_TOKEN_MAX_AGE_SEC + 60) * 1000),
      },
    });
    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { oidcSid: 'sid-1' },
    });
    expect(result).toEqual({
      userId: 'u1',
      meta: { sid: 'sid-1', sub: 'sub-1' },
      deleted: 2,
    });
  });

  it('기간이 지난 jti 는 지운다', async () => {
    await make().logout('token');
    expect(prisma.oidcLogoutJti.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) as Date } },
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
