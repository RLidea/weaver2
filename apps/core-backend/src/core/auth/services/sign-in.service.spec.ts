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

jest.mock('../repositories/increment-failed-attempts.command', () => ({
  IncrementFailedAttemptsCommand: jest.fn(),
}));

jest.mock('../repositories/reset-failed-attempts.command', () => ({
  ResetFailedAttemptsCommand: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { IncrementFailedAttemptsCommand } from '../repositories/increment-failed-attempts.command';
import { ResetFailedAttemptsCommand } from '../repositories/reset-failed-attempts.command';

describe('SignInService.validateUserByEmail', () => {
  let service: SignInService;
  let prisma: any;
  const mockFind = FindUserByEmailQuery as jest.Mock;
  const mockIncrement = IncrementFailedAttemptsCommand as jest.Mock;
  const mockReset = ResetFailedAttemptsCommand as jest.Mock;
  const mockCompare = bcrypt.compare as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      user: { findFirst: jest.fn() },
    };
    service = new SignInService(prisma as PrismaService, {} as JwtService);
  });

  it('이메일 매칭 X + 탈퇴 계정 → ACCOUNT_DELETED', async () => {
    mockFind.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({ id: 'deleted-1' });

    await expect(service.validateUserByEmail('a@b.c', 'pw')).rejects.toThrow(
      /ACCOUNT_DELETED/,
    );
  });

  it('이메일 매칭 X + 탈퇴도 아님 → Invalid credentials', async () => {
    mockFind.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.validateUserByEmail('a@b.c', 'pw')).rejects.toThrow(
      /Invalid credentials/,
    );
  });

  it('localCredential 없으면 Invalid credentials (OAuth-only 계정)', async () => {
    mockFind.mockResolvedValue({ id: 'u1', localCredential: null });

    await expect(service.validateUserByEmail('a@b.c', 'pw')).rejects.toThrow(
      /Invalid credentials/,
    );
  });

  it('정지 계정 (suspendedUntil 미래) → suspended 메시지', async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    mockFind.mockResolvedValue({
      id: 'u1',
      suspendedUntil: future,
      localCredential: { password: 'hash', isVerified: true },
    });

    await expect(service.validateUserByEmail('a@b.c', 'pw')).rejects.toThrow(
      /suspended/i,
    );
  });

  it('정지 해제 (suspendedUntil 과거 = epoch 0) → 다음 검증으로 통과', async () => {
    mockFind.mockResolvedValue({
      id: 'u1',
      suspendedUntil: new Date(0),
      localCredential: {
        password: 'hash',
        isVerified: true,
        lockedUntil: null,
      },
    });
    mockCompare.mockResolvedValue(true);

    await expect(
      service.validateUserByEmail('a@b.c', 'pw'),
    ).resolves.toBeDefined();
    expect(mockReset).toHaveBeenCalledWith(prisma, 'u1');
  });

  it('계정 잠금 (lockedUntil 미래) → temporarily locked', async () => {
    const future = new Date(Date.now() + 60 * 1000);
    mockFind.mockResolvedValue({
      id: 'u1',
      suspendedUntil: null,
      localCredential: {
        password: 'hash',
        isVerified: true,
        lockedUntil: future,
      },
    });

    await expect(service.validateUserByEmail('a@b.c', 'pw')).rejects.toThrow(
      /temporarily locked/i,
    );
  });

  it('비밀번호 불일치 → IncrementFailedAttempts + Invalid credentials', async () => {
    mockFind.mockResolvedValue({
      id: 'u1',
      suspendedUntil: null,
      localCredential: {
        password: 'hash',
        isVerified: true,
        lockedUntil: null,
      },
    });
    mockCompare.mockResolvedValue(false);

    await expect(service.validateUserByEmail('a@b.c', 'wrong')).rejects.toThrow(
      /Invalid credentials/,
    );

    expect(mockIncrement).toHaveBeenCalledWith(prisma, 'u1');
  });

  it('미인증 이메일 → EMAIL_NOT_VERIFIED', async () => {
    mockFind.mockResolvedValue({
      id: 'u1',
      suspendedUntil: null,
      localCredential: {
        password: 'hash',
        isVerified: false,
        lockedUntil: null,
      },
    });
    mockCompare.mockResolvedValue(true);

    await expect(service.validateUserByEmail('a@b.c', 'pw')).rejects.toThrow(
      /EMAIL_NOT_VERIFIED/,
    );
  });

  it('성공 시 ResetFailedAttempts 호출 후 user 반환', async () => {
    const user = {
      id: 'u1',
      suspendedUntil: null,
      localCredential: {
        password: 'hash',
        isVerified: true,
        lockedUntil: null,
      },
    };
    mockFind.mockResolvedValue(user);
    mockCompare.mockResolvedValue(true);

    const result = await service.validateUserByEmail('a@b.c', 'pw');
    expect(mockReset).toHaveBeenCalledWith(prisma, 'u1');
    expect(result).toBe(user);
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
    const delMod = await import(
      '../repositories/delete-refresh-tokens-by-user-id.command'
    );
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
      .mockResolvedValueOnce({ count: 1 } as any);

    await expect(service.refresh('tok')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(revokeSpy).toHaveBeenCalledWith(prisma, 'u1');
  });

  it('회전된 토큰 재제시 + grace window 이내 → 무효화 없이 401 (정상 경합)', async () => {
    const findMod = await import('../repositories/find-refresh-token.query');
    const delMod = await import(
      '../repositories/delete-refresh-tokens-by-user-id.command'
    );
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
