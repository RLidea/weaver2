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

  describe('회전 — 한 트랜잭션, 그 사람의 users 행을 잠그고', () => {
    let tx: any;
    let markSpy: jest.SpyInstance;
    let createSpy: jest.SpyInstance;
    let revokedSpy: jest.SpyInstance;
    let findSpy: jest.SpyInstance;
    let sign: jest.Mock<string, [Record<string, unknown>]>;

    beforeEach(async () => {
      const findMod = await import('../repositories/find-refresh-token.query');
      const markMod =
        await import('../repositories/mark-refresh-token-rotated.command');
      const purgeMod =
        await import('../repositories/purge-stale-refresh-tokens.command');
      const createMod =
        await import('../repositories/create-refresh-token.command');
      const revokedMod =
        await import('../repositories/is-refresh-session-revoked.query');
      findSpy = jest.spyOn(findMod, 'FindRefreshTokenQuery');
      findSpy.mockResolvedValueOnce({
        id: 'rt1',
        userId: 'u1',
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        rotatedAt: null,
        oidcSid: 'sid-1',
        createdAt: new Date(),
        user: { id: 'u1', deletedAt: null },
      } as any);
      markSpy = jest
        .spyOn(markMod, 'MarkRefreshTokenRotatedCommand')
        .mockResolvedValue({ count: 1 });
      jest
        .spyOn(purgeMod, 'PurgeStaleRefreshTokensCommand')
        .mockResolvedValue({ count: 0 });
      createSpy = jest
        .spyOn(createMod, 'CreateRefreshTokenCommand')
        .mockResolvedValue({} as any);
      revokedSpy = jest
        .spyOn(revokedMod, 'IsRefreshSessionRevokedQuery')
        .mockResolvedValue(false);
      tx = {
        $queryRaw: jest.fn(),
        refreshToken: { deleteMany: jest.fn() },
      };
      prisma.$transaction = jest.fn((fn: (t: unknown) => unknown) => fn(tx));
      sign = jest.fn<string, [Record<string, unknown>]>(() => 'jwt');
      service = new SignInService(
        prisma as PrismaService,
        { sign } as unknown as JwtService,
      );
    });

    afterEach(() => jest.restoreAllMocks());

    it('새 access token 도 sid 를 이어 싣는다 — 회전한 세션도 back-channel 로그아웃에 바로 막히게', async () => {
      await service.refresh('tok');
      expect(sign).toHaveBeenCalledWith({ sub: 'u1', sid: 'sid-1' });
    });

    it('sid 없는 세션의 회전은 sid 클레임을 싣지 않는다(키도 없다)', async () => {
      findSpy.mockReset().mockResolvedValueOnce({
        id: 'rt1',
        userId: 'u1',
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        rotatedAt: null,
        oidcSid: null,
        createdAt: new Date(),
        user: { id: 'u1', deletedAt: null },
      } as any);
      await service.refresh('tok');
      const payload = sign.mock.calls[0][0];
      expect(payload).toEqual({ sub: 'u1' });
      expect('sid' in payload).toBe(false);
    });

    it('새 행은 옛 행의 oidcSid 를 이어받는다 — back-channel 로그아웃이 회전한 세션에도 닿게', async () => {
      await service.refresh('tok', '1.2.3.4', 'ua');
      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(markSpy).toHaveBeenCalledWith(tx, 'tok', expect.any(Date));
      expect(createSpy).toHaveBeenCalledWith(
        tx,
        'u1',
        expect.any(String),
        expect.any(Date),
        '1.2.3.4',
        'ua',
        'sid-1',
      );
    });

    it('back-channel 로그아웃이 끝낸 세션(묘비 · sessionsRevokedAt)이면 그 행을 지우고 401 — 새 행은 없다', async () => {
      revokedSpy.mockResolvedValue(true);
      await expect(service.refresh('tok')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { id: 'rt1' },
      });
      expect(markSpy).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('마킹이 0 건이면(동시 refresh 가 먼저 회전 · 행이 지워짐) 401 — 새 행을 두 번 만들지 않는다', async () => {
      markSpy.mockResolvedValue({ count: 0 });
      await expect(service.refresh('tok')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(createSpy).not.toHaveBeenCalled();
    });
  });
});

describe('SignInService.login — access token 의 sid 클레임', () => {
  let service: SignInService;
  let sign: jest.Mock<string, [Record<string, unknown>]>;

  beforeEach(async () => {
    const createMod =
      await import('../repositories/create-refresh-token.command');
    jest
      .spyOn(createMod, 'CreateRefreshTokenCommand')
      .mockResolvedValue({} as never);
    sign = jest.fn<string, [Record<string, unknown>]>(() => 'jwt');
    const tx = { $queryRaw: jest.fn(), user: { update: jest.fn() } };
    service = new SignInService(
      {
        $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)),
      } as unknown as PrismaService,
      { sign } as unknown as JwtService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('SSO 로그인(oidcSid 있음) → sid 를 싣는다', async () => {
    await service.login('u1', 'oidc', false, '1.2.3.4', 'ua', 'sid-1');
    expect(sign).toHaveBeenCalledWith({ sub: 'u1', sid: 'sid-1' });
  });

  it('그 밖의 로그인 → sid 키를 넣지 않는다', async () => {
    await service.login('u1', 'local');
    const payload = sign.mock.calls[0][0];
    expect(payload).toEqual({ sub: 'u1' });
    expect('sid' in payload).toBe(false);
  });
});

describe('SignInService.login — 맞춰 본 비밀번호를 사용자 행 잠금 아래에서 견준다', () => {
  const VERIFIED_AT = new Date('2026-10-21T00:00:00.000Z');
  let service: SignInService;
  let tx: {
    $queryRaw: jest.Mock;
    user: { update: jest.Mock };
    localCredential: { findUnique: jest.Mock };
  };
  let createSpy: jest.SpyInstance;
  let calls: string[];

  beforeEach(async () => {
    const createMod =
      await import('../repositories/create-refresh-token.command');
    calls = [];
    createSpy = jest
      .spyOn(createMod, 'CreateRefreshTokenCommand')
      .mockImplementation(() => {
        calls.push('createRefresh');
        return Promise.resolve({} as never);
      });
    tx = {
      $queryRaw: jest.fn(() => Promise.resolve(calls.push('lock'))),
      user: { update: jest.fn() },
      localCredential: {
        findUnique: jest.fn(() => {
          calls.push('readCredential');
          return Promise.resolve({ passwordChangedAt: VERIFIED_AT });
        }),
      },
    };
    service = new SignInService(
      {
        $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)),
      } as unknown as PrismaService,
      { sign: () => 'jwt' } as unknown as JwtService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('그대로면 잠근 뒤 견주고 같은 트랜잭션에서 refresh 행을 넣는다', async () => {
    await expect(
      service.login('u1', 'email', false, undefined, undefined, undefined, {
        changedAtMs: VERIFIED_AT.getTime(),
        via: 'password',
      }),
    ).resolves.toMatchObject({ accessToken: 'jwt' });
    expect(calls).toEqual(['lock', 'readCredential', 'createRefresh']);
    expect(createSpy).toHaveBeenCalledWith(
      tx,
      'u1',
      expect.any(String),
      expect.any(Date),
      undefined,
      undefined,
      undefined,
    );
    expect(tx.user.update).toHaveBeenCalled();
  });

  it('그 사이 비밀번호가 바뀌었으면(비밀번호 길) 「잘못된 자격 증명」 — refresh 행도 lastLoginAt 도 없다', async () => {
    tx.localCredential.findUnique.mockResolvedValue({
      passwordChangedAt: new Date(VERIFIED_AT.getTime() + 1),
    });
    await expect(
      service.login('u1', 'email', false, undefined, undefined, undefined, {
        changedAtMs: VERIFIED_AT.getTime(),
        via: 'password',
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    expect(createSpy).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('2FA 를 거친 길이면 「pre-auth 가 낡았다」 — 로그인부터 다시', async () => {
    tx.localCredential.findUnique.mockResolvedValue({
      passwordChangedAt: new Date(VERIFIED_AT.getTime() + 1),
    });
    await expect(
      service.login(
        'u1',
        'two-factor',
        false,
        undefined,
        undefined,
        undefined,
        {
          changedAtMs: VERIFIED_AT.getTime(),
          via: 'two-factor',
        },
      ),
    ).rejects.toThrow(
      new UnauthorizedException('Invalid or expired pre-auth token'),
    );
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('자격 행이 사라졌으면 거절한다', async () => {
    tx.localCredential.findUnique.mockResolvedValue(null);
    await expect(
      service.login('u1', 'email', false, undefined, undefined, undefined, {
        changedAtMs: VERIFIED_AT.getTime(),
        via: 'password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('비밀번호가 없는 길(OAuth · SSO)은 잠그기만 하고 견주지 않는다', async () => {
    await service.login('u1', 'oidc', false, undefined, undefined, 'sid-1');
    expect(calls).toEqual(['lock', 'createRefresh']);
    expect(tx.localCredential.findUnique).not.toHaveBeenCalled();
  });
});
