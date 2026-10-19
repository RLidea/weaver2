import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PrismaService } from '@weaver2/prisma';
import {
  AccountSuspendedException,
  SignInCompletionService,
} from './sign-in-completion.service';
import { SignInService } from './sign-in.service';
import { TwoFactorService } from './two-factor.service';

describe('SignInCompletionService — 모든 로그인 경로의 끝', () => {
  const tokens = { accessToken: 'a', refreshToken: 'r', tokenExpiry: 1000 };
  let prisma: {
    user: { findUnique: jest.Mock };
    twoFactorMethod: { findMany: jest.Mock };
  };
  let signIn: { login: jest.Mock };
  let twoFactor: { createPreAuthToken: jest.Mock };
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };
  let service: SignInCompletionService;
  const context = {
    provider: 'email',
    rememberMe: true,
    ipAddress: '1.2.3.4',
    userAgent: 'ua',
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ deletedAt: null, suspendedUntil: null }),
      },
      twoFactorMethod: { findMany: jest.fn().mockResolvedValue([]) },
    };
    signIn = { login: jest.fn().mockResolvedValue(tokens) };
    twoFactor = { createPreAuthToken: jest.fn().mockReturnValue('pre') };
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
    service = new SignInCompletionService(
      prisma as unknown as PrismaService,
      signIn as unknown as SignInService,
      twoFactor as unknown as TwoFactorService,
      { get: () => 'test' } as unknown as ConfigService,
    );
  });

  const cookieNames = () =>
    res.cookie.mock.calls.map((c: unknown[]) => c[0] as string);

  it('2FA 가 없으면 IP·UA·rememberMe 를 반영해 세션을 준다', async () => {
    await expect(
      service.complete('u1', context, res as unknown as Response),
    ).resolves.toEqual({ twoFactorRequired: false });

    expect(signIn.login).toHaveBeenCalledWith(
      'u1',
      'email',
      true,
      '1.2.3.4',
      'ua',
    );
    expect(cookieNames()).toEqual(['access_token', 'refresh_token']);
  });

  it('확인된 2FA 가 있으면 pre_auth 쿠키만 주고 세션은 주지 않는다', async () => {
    prisma.twoFactorMethod.findMany.mockResolvedValue([{ kind: 'EMAIL' }]);

    await expect(
      service.complete('u1', context, res as unknown as Response),
    ).resolves.toEqual({
      twoFactorRequired: true,
      availableMethods: { totp: false, email: true },
    });

    expect(twoFactor.createPreAuthToken).toHaveBeenCalledWith('u1', true);
    expect(cookieNames()).toEqual(['pre_auth']);
    expect(signIn.login).not.toHaveBeenCalled();
  });

  it('2FA 를 통과한 뒤에는 2FA 를 다시 요구하지 않고 세션을 주며 pre_auth 를 지운다', async () => {
    prisma.twoFactorMethod.findMany.mockResolvedValue([{ kind: 'TOTP' }]);

    await service.completeAfterTwoFactor(
      'u1',
      context,
      res as unknown as Response,
    );

    expect(signIn.login).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith('pre_auth', expect.anything());
  });

  it.each([
    [
      '탈퇴',
      { deletedAt: new Date(), suspendedUntil: null },
      /ACCOUNT_DELETED/,
    ],
    [
      '정지',
      { deletedAt: null, suspendedUntil: new Date(Date.now() + 60_000) },
      /suspended/,
    ],
  ])(
    '%s 계정은 2FA 통과 뒤에도 거절한다 — pre-auth 5분 사이에 끼어들 수 있다',
    async (_label, state, message) => {
      prisma.user.findUnique.mockResolvedValue(state);

      await expect(
        service.completeAfterTwoFactor(
          'u1',
          context,
          res as unknown as Response,
        ),
      ).rejects.toThrow(message);
      expect(signIn.login).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.clearCookie).not.toHaveBeenCalled();
    },
  );

  it('2FA 가 있는 정지 계정은 비밀번호만으로는 정지 사실을 듣지 못하고 2FA 단계로 간다', async () => {
    prisma.user.findUnique.mockResolvedValue({
      deletedAt: null,
      suspendedUntil: new Date(Date.now() + 60_000),
    });
    prisma.twoFactorMethod.findMany.mockResolvedValue([{ kind: 'TOTP' }]);

    await expect(
      service.complete('u1', context, res as unknown as Response),
    ).resolves.toMatchObject({ twoFactorRequired: true });
    expect(signIn.login).not.toHaveBeenCalled();
  });

  it('2FA 가 없는 정지 계정은 비밀번호 뒤에 바로 거절한다 — 정지 타입으로', async () => {
    prisma.user.findUnique.mockResolvedValue({
      deletedAt: null,
      suspendedUntil: new Date(Date.now() + 60_000),
    });

    await expect(
      service.complete('u1', context, res as unknown as Response),
    ).rejects.toBeInstanceOf(AccountSuspendedException);
  });

  it('정지가 풀린 계정은 통과한다', async () => {
    prisma.user.findUnique.mockResolvedValue({
      deletedAt: null,
      suspendedUntil: new Date(0),
    });

    await expect(
      service.complete('u1', context, res as unknown as Response),
    ).resolves.toEqual({ twoFactorRequired: false });
  });

  it('없는 사용자는 거절한다', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.complete('u1', context, res as unknown as Response),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  describe('completeExternal — 바깥 계정 서버(SSO)가 신원을 확인한 뒤', () => {
    const external = { ...context, provider: 'oidc', rememberMe: false };

    it('2FA 를 켠 사람도 pre_auth 없이 세션을 준다 (rememberMe=false)', async () => {
      prisma.twoFactorMethod.findMany.mockResolvedValue([{ kind: 'TOTP' }]);
      await service.completeExternal(
        'u1',
        external,
        res as unknown as Response,
      );
      expect(twoFactor.createPreAuthToken).not.toHaveBeenCalled();
      expect(signIn.login).toHaveBeenCalledWith(
        'u1',
        'oidc',
        false,
        '1.2.3.4',
        'ua',
      );
      expect(cookieNames()).toEqual(['access_token', 'refresh_token']);
    });

    it('탈퇴 · 정지 검사는 그대로다', async () => {
      prisma.user.findUnique.mockResolvedValue({
        deletedAt: new Date(),
        suspendedUntil: null,
      });
      await expect(
        service.completeExternal('u1', external, res as unknown as Response),
      ).rejects.toThrow('ACCOUNT_DELETED');
      prisma.user.findUnique.mockResolvedValue({
        deletedAt: null,
        suspendedUntil: new Date(Date.now() + 60_000),
      });
      await expect(
        service.completeExternal('u1', external, res as unknown as Response),
      ).rejects.toBeInstanceOf(AccountSuspendedException);
      expect(signIn.login).not.toHaveBeenCalled();
    });
  });

  describe('decide — 전달 방식에 묶이지 않는 결정', () => {
    const suspended = {
      deletedAt: null,
      suspendedUntil: new Date(Date.now() + 60_000),
    };

    const untouched = () => {
      expect(signIn.login).not.toHaveBeenCalled();
      expect(twoFactor.createPreAuthToken).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.clearCookie).not.toHaveBeenCalled();
    };

    it('탈퇴 계정은 거절한다', async () => {
      prisma.user.findUnique.mockResolvedValue({
        deletedAt: new Date(),
        suspendedUntil: null,
      });
      await expect(
        service.decide('u1', { twoFactorPassed: false }),
      ).rejects.toThrow(/ACCOUNT_DELETED/);
      untouched();
    });

    it('확인된 2FA 가 있고 통과 전이면 twoFactorRequired 와 수단을 돌려준다', async () => {
      prisma.twoFactorMethod.findMany.mockResolvedValue([{ kind: 'TOTP' }]);
      await expect(
        service.decide('u1', { twoFactorPassed: false }),
      ).resolves.toEqual({
        twoFactorRequired: true,
        availableMethods: { totp: true, email: false },
      });
      untouched();
    });

    it('2FA 가 없는 정지 계정은 바로 거절한다', async () => {
      prisma.user.findUnique.mockResolvedValue(suspended);
      await expect(
        service.decide('u1', { twoFactorPassed: false }),
      ).rejects.toBeInstanceOf(AccountSuspendedException);
      untouched();
    });

    it('2FA 가 있는 정지 계정은 통과 전에는 정지 대신 twoFactorRequired 를 돌려준다', async () => {
      prisma.user.findUnique.mockResolvedValue(suspended);
      prisma.twoFactorMethod.findMany.mockResolvedValue([{ kind: 'EMAIL' }]);
      await expect(
        service.decide('u1', { twoFactorPassed: false }),
      ).resolves.toMatchObject({ twoFactorRequired: true });
      untouched();
    });

    it('2FA 를 통과한 정지 계정은 거절한다', async () => {
      prisma.user.findUnique.mockResolvedValue(suspended);
      prisma.twoFactorMethod.findMany.mockResolvedValue([{ kind: 'EMAIL' }]);
      await expect(
        service.decide('u1', { twoFactorPassed: true }),
      ).rejects.toBeInstanceOf(AccountSuspendedException);
      untouched();
    });

    it('정상 계정은 twoFactorRequired: false', async () => {
      await expect(
        service.decide('u1', { twoFactorPassed: false }),
      ).resolves.toEqual({ twoFactorRequired: false });
      untouched();
    });
  });
});
