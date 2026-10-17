import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PrismaService } from '@weaver2/prisma';
import { SignInCompletionService } from './sign-in-completion.service';
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
    },
  );

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
});
