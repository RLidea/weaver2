import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SignInService } from './sign-in.service';
import { PrismaService } from '@weaver2/prisma';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('../repositories/find-user-by-email.query', () => ({
  FindUserByEmailQuery: jest.fn(),
}));

jest.mock('../repositories/reserve-auth-attempt.command', () => ({
  ...jest.requireActual<
    typeof import('../repositories/reserve-auth-attempt.command')
  >('../repositories/reserve-auth-attempt.command'),
  ReserveAuthAttemptCommand: jest.fn(),
}));

jest.mock('../repositories/reset-auth-attempts.command', () => ({
  ResetAuthAttemptsCommand: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { ReserveAuthAttemptCommand } from '../repositories/reserve-auth-attempt.command';
import { ResetAuthAttemptsCommand } from '../repositories/reset-auth-attempts.command';

describe('SignInService.validateUserByEmail', () => {
  let service: SignInService;
  let prisma: any;
  const mockFind = FindUserByEmailQuery as jest.Mock;
  const mockReserve = ReserveAuthAttemptCommand as jest.Mock;
  const mockReset = ResetAuthAttemptsCommand as jest.Mock;
  const mockCompare = bcrypt.compare as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReserve.mockResolvedValue(true);

    prisma = {};
    service = new SignInService(prisma as PrismaService, {} as JwtService);
  });

  it('없는 이메일(탈퇴 포함)은 계정 상태를 말하지 않고 Invalid credentials', async () => {
    // 탈퇴 계정은 찾지 않는다(FindUserByEmailQuery) — 비밀번호를 보기 전에 상태가 새지 않게
    mockFind.mockResolvedValue(null);

    await expect(service.validateUserByEmail('a@b.c', 'pw')).rejects.toThrow(
      /Invalid credentials/,
    );
    expect(mockReserve).not.toHaveBeenCalled();
  });

  it('localCredential 없으면 Invalid credentials (OAuth-only 계정)', async () => {
    mockFind.mockResolvedValue({ id: 'u1', localCredential: null });

    await expect(service.validateUserByEmail('a@b.c', 'pw')).rejects.toThrow(
      /Invalid credentials/,
    );
  });

  it('정지 계정이라도 비밀번호가 틀리면 정지 사실을 말하지 않는다', async () => {
    // 정지는 SignInCompletionService 가 비밀번호가 맞은 뒤에 본다
    mockFind.mockResolvedValue({
      id: 'u1',
      suspendedUntil: new Date(Date.now() + 1000 * 60 * 60),
      emailVerifiedAt: new Date(),
      localCredential: { passwordHash: 'hash' },
    });
    mockCompare.mockResolvedValue(false);

    await expect(service.validateUserByEmail('a@b.c', 'pw')).rejects.toThrow(
      /Invalid credentials/,
    );
  });

  it('정지 해제 (suspendedUntil 과거 = epoch 0) → 다음 검증으로 통과', async () => {
    mockFind.mockResolvedValue({
      id: 'u1',
      suspendedUntil: new Date(0),
      emailVerifiedAt: new Date(),
      twoFactorMethods: [],
      localCredential: {
        passwordHash: 'hash',
      },
    });
    mockCompare.mockResolvedValue(true);

    await expect(
      service.validateUserByEmail('a@b.c', 'pw'),
    ).resolves.toBeDefined();
    expect(mockReset).toHaveBeenCalledWith(prisma, 'u1', 'PASSWORD');
  });

  it('계정 잠금 (시도를 잡지 못함) → 비밀번호를 보지도 않고 temporarily locked', async () => {
    mockReserve.mockResolvedValue(false);
    mockFind.mockResolvedValue({
      id: 'u1',
      suspendedUntil: null,
      emailVerifiedAt: new Date(),
      twoFactorMethods: [],
      localCredential: {
        passwordHash: 'hash',
      },
    });

    await expect(service.validateUserByEmail('a@b.c', 'pw')).rejects.toThrow(
      /temporarily locked/i,
    );
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it('비밀번호 불일치 → 잡아 둔 시도가 실패로 남고 Invalid credentials', async () => {
    mockFind.mockResolvedValue({
      id: 'u1',
      suspendedUntil: null,
      emailVerifiedAt: new Date(),
      twoFactorMethods: [],
      localCredential: {
        passwordHash: 'hash',
      },
    });
    mockCompare.mockResolvedValue(false);

    await expect(service.validateUserByEmail('a@b.c', 'wrong')).rejects.toThrow(
      /Invalid credentials/,
    );

    expect(mockReserve).toHaveBeenCalledWith(prisma, 'u1', 'PASSWORD');
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('미인증 이메일 → EMAIL_NOT_VERIFIED', async () => {
    mockFind.mockResolvedValue({
      id: 'u1',
      suspendedUntil: null,
      emailVerifiedAt: null,
      twoFactorMethods: [],
      localCredential: {
        passwordHash: 'hash',
      },
    });
    mockCompare.mockResolvedValue(true);

    await expect(service.validateUserByEmail('a@b.c', 'pw')).rejects.toThrow(
      /EMAIL_NOT_VERIFIED/,
    );
  });

  it('성공 시 PASSWORD 시도를 되돌리고 user 반환', async () => {
    const user = {
      id: 'u1',
      suspendedUntil: null,
      emailVerifiedAt: new Date(),
      twoFactorMethods: [],
      localCredential: {
        passwordHash: 'hash',
      },
    };
    mockFind.mockResolvedValue(user);
    mockCompare.mockResolvedValue(true);

    const result = await service.validateUserByEmail('a@b.c', 'pw');
    expect(mockReset).toHaveBeenCalledWith(prisma, 'u1', 'PASSWORD');
    expect(result).toBe(user);
  });

  it('2FA 가 켜진 계정도 비밀번호가 맞으면 PASSWORD 만 비운다 — 2FA 실패는 따로 센다', async () => {
    // 2FA 코드는 SECOND_FACTOR 로 세므로 「다시 로그인 → 코드 4번」을 되풀이해도 그쪽은 비지 않는다
    const user = {
      id: 'u1',
      suspendedUntil: null,
      emailVerifiedAt: new Date(),
      twoFactorMethods: [{ kind: 'TOTP' }],
      localCredential: {
        passwordHash: 'hash',
      },
    };
    mockFind.mockResolvedValue(user);
    mockCompare.mockResolvedValue(true);

    await service.validateUserByEmail('a@b.c', 'pw');
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith(prisma, 'u1', 'PASSWORD');
  });
});

describe('SignInService.refresh', () => {
  let service: SignInService;
  let prisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      user: { findFirst: jest.fn() },
    };
    service = new SignInService(prisma as PrismaService, {} as JwtService);
  });

  it('만료된/없는 refresh token → UnauthorizedException', async () => {
    jest
      .spyOn(
        await import('../repositories/find-refresh-token.query'),
        'FindRefreshTokenQuery',
      )
      .mockResolvedValueOnce(null);

    await expect(service.refresh('tok')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('회전된 토큰 재제시 + grace window 초과 → 전 세션 무효화 후 401', async () => {
    const findMod = await import('../repositories/find-refresh-token.query');
    const delMod =
      await import('../repositories/delete-refresh-tokens-by-user-id.command');
    const rotatedLongAgo = new Date(Date.now() - 60 * 1000); // 60초 전(grace 30초 초과)
    jest.spyOn(findMod, 'FindRefreshTokenQuery').mockResolvedValueOnce({
      id: 'rt1',
      userId: 'u1',
      expires: new Date(Date.now() + 100000),
      rotatedAt: rotatedLongAgo,
      user: { id: 'u1', deletedAt: null },
    } as any);
    const revokeSpy = jest
      .spyOn(delMod, 'DeleteRefreshTokensByUserIdCommand')
      .mockResolvedValueOnce({ count: 1 });

    await expect(service.refresh('tok')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(revokeSpy).toHaveBeenCalledWith(prisma, 'u1');
  });

  it('회전된 토큰 재제시 + grace window 이내 → 무효화 없이 401 (정상 경합)', async () => {
    const findMod = await import('../repositories/find-refresh-token.query');
    const delMod =
      await import('../repositories/delete-refresh-tokens-by-user-id.command');
    const rotatedJustNow = new Date(Date.now() - 1000); // 1초 전
    jest.spyOn(findMod, 'FindRefreshTokenQuery').mockResolvedValueOnce({
      id: 'rt1',
      userId: 'u1',
      expires: new Date(Date.now() + 100000),
      rotatedAt: rotatedJustNow,
      user: { id: 'u1', deletedAt: null },
    } as any);
    const revokeSpy = jest.spyOn(delMod, 'DeleteRefreshTokensByUserIdCommand');

    await expect(service.refresh('tok')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(revokeSpy).not.toHaveBeenCalled();
  });
});
