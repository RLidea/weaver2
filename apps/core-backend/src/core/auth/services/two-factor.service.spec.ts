// otplib는 ESM-only 형태라 jest 환경에서 모킹 필수
jest.mock('../repositories/reserve-auth-attempt.command', () => ({
  ...jest.requireActual<
    typeof import('../repositories/reserve-auth-attempt.command')
  >('../repositories/reserve-auth-attempt.command'),
  ReserveAuthAttemptCommand: jest.fn().mockResolvedValue(true),
}));
jest.mock('../repositories/reset-auth-attempts.command', () => ({
  ResetAuthAttemptsCommand: jest.fn(),
}));
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'secret'),
  generateURI: jest.fn(() => 'otpauth://test'),
  verify: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,test')),
}));

jest.mock('../repositories/find-two-factor-methods.query', () => ({
  FindTwoFactorMethodsQuery: jest.fn(),
}));
jest.mock('../repositories/start-totp-setup.command', () => ({
  StartTotpSetupCommand: jest.fn(),
}));
jest.mock('../repositories/confirm-totp-setup.command', () => ({
  ConfirmTotpSetupCommand: jest.fn(),
}));

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TwoFactorService } from './two-factor.service';
import { PrismaService } from '@weaver2/prisma';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { OneTimeCodeService } from '../one-time-code/one-time-code.service';
import { jwtModuleOptions } from '../strategy/jwt-module-options';
import { encryptSecret } from '../utils/auth-crypto.util';
import * as otplib from 'otplib';
import { FindTwoFactorMethodsQuery } from '../repositories/find-two-factor-methods.query';
import { StartTotpSetupCommand } from '../repositories/start-totp-setup.command';
import { ConfirmTotpSetupCommand } from '../repositories/confirm-totp-setup.command';

// 운영과 같은 JwtModule 옵션(기본 aud = access)으로 만든 실제 JwtService
const realJwt = () =>
  new JwtService(
    jwtModuleOptions(new ConfigService({ JWT_SECRET: 'two-factor-spec' })),
  );

describe('TwoFactorService.verifyPreAuthToken', () => {
  let jwt: JwtService;
  let service: TwoFactorService;

  beforeEach(() => {
    jwt = realJwt();
    service = new TwoFactorService(
      {} as PrismaService,
      jwt,
      {} as EmailBusinessService,
      {} as OneTimeCodeService,
    );
  });

  it('발급한 pre-auth 토큰 → userId/rememberMe 반환', () => {
    const token = service.createPreAuthToken('user-1', true);
    expect(service.verifyPreAuthToken(token)).toEqual({
      userId: 'user-1',
      rememberMe: true,
      issuedAtMs: expect.any(Number) as number,
    });
  });

  it('rememberMe 미지정 시 false', () => {
    const token = service.createPreAuthToken('user-1');
    expect(service.verifyPreAuthToken(token).rememberMe).toBe(false);
  });

  it('액세스 토큰을 pre-auth 자리에 넣으면 거절 (종류는 aud 로 가른다)', () => {
    const access = jwt.sign({ sub: 'user-1' });
    expect(() => service.verifyPreAuthToken(access)).toThrow(
      UnauthorizedException,
    );
  });

  it('pre-auth 토큰은 기본 검증(액세스)을 통과하지 못한다', () => {
    const token = service.createPreAuthToken('user-1');
    expect(() => jwt.verify(token)).toThrow(/audience/);
  });

  it('jwt 검증 실패(만료/위조) → UnauthorizedException', () => {
    expect(() => service.verifyPreAuthToken('not-a-jwt')).toThrow(
      /expired pre-auth/,
    );
  });
});

describe('TwoFactorService TOTP 등록 — 확인된 TOTP 는 등록 경로가 덮지 않는다', () => {
  const ENCRYPTION_KEY = 'a'.repeat(64);
  const mockFindMethods = FindTwoFactorMethodsQuery as jest.Mock;
  const mockStart = StartTotpSetupCommand as jest.Mock;
  const mockConfirm = ConfirmTotpSetupCommand as jest.Mock;
  let service: TwoFactorService;
  let originalKey: string | undefined;

  beforeAll(() => {
    originalKey = process.env.TOTP_ENCRYPTION_KEY;
    process.env.TOTP_ENCRYPTION_KEY = ENCRYPTION_KEY;
  });
  afterAll(() => {
    if (originalKey === undefined) delete process.env.TOTP_ENCRYPTION_KEY;
    else process.env.TOTP_ENCRYPTION_KEY = originalKey;
  });

  const methods = (totp: Record<string, unknown> | null) => ({
    totp,
    confirmedTotp: totp?.confirmedAt ? totp : null,
    email: null,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'a@b.c' }) },
    };
    service = new TwoFactorService(
      prisma as unknown as PrismaService,
      realJwt(),
      {} as EmailBusinessService,
      {} as OneTimeCodeService,
    );
    (otplib.generateSecret as jest.Mock).mockReturnValue('secret');
    (otplib.generateURI as jest.Mock).mockReturnValue('otpauth://test');
  });

  it('인증 앱 발급자 이름은 TOTP_ISSUER 를 따르고, 없으면 Weaver2', async () => {
    mockFindMethods.mockResolvedValue(methods(null));
    mockStart.mockResolvedValue(true);
    const original = process.env.TOTP_ISSUER;
    try {
      delete process.env.TOTP_ISSUER;
      await service.generateTotpSetup('user-1');
      expect(otplib.generateURI).toHaveBeenLastCalledWith(
        expect.objectContaining({ issuer: 'Weaver2', label: 'a@b.c' }),
      );

      process.env.TOTP_ISSUER = ' RLidea ';
      await service.generateTotpSetup('user-1');
      expect(otplib.generateURI).toHaveBeenLastCalledWith(
        expect.objectContaining({ issuer: 'RLidea' }),
      );
    } finally {
      if (original === undefined) delete process.env.TOTP_ISSUER;
      else process.env.TOTP_ISSUER = original;
    }
  });

  it('확인된 TOTP 가 있으면 등록 시작을 거절하고 아무것도 쓰지 않는다', async () => {
    mockFindMethods.mockResolvedValue(methods({ confirmedAt: new Date() }));
    await expect(service.generateTotpSetup('user-1')).rejects.toThrow(
      ConflictException,
    );
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('없으면 암호화한 새 비밀을 쓴다', async () => {
    mockFindMethods.mockResolvedValue(methods(null));
    mockStart.mockResolvedValue(true);

    const result = await service.generateTotpSetup('user-1');

    expect(result.secret).toBe('secret');
    expect(mockStart).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.stringMatching(/^v1:/),
    );
  });

  it('확인과 쓰기 사이에 확인됐으면(쓰지 못함) 거절한다', async () => {
    mockFindMethods.mockResolvedValue(methods(null));
    mockStart.mockResolvedValue(false);
    await expect(service.generateTotpSetup('user-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('등록 확인은 코드를 확인한 바로 그 비밀과, 그 코드의 시간 단위로 한다', async () => {
    const stored = encryptSecret('secret');
    mockFindMethods.mockResolvedValue(
      methods({
        confirmedAt: null,
        secretEncrypted: stored,
        lastUsedTimeStep: null,
      }),
    );
    (otplib.verify as jest.Mock).mockResolvedValue({
      valid: true,
      timeStep: 42,
    });
    mockConfirm.mockResolvedValue(true);

    await service.confirmTotpSetup('user-1', '123456');

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      stored,
      42,
    );
  });

  it('확인하는 사이 등록이 다시 시작됐으면(쓰지 못함) 켜지 않고 거절한다', async () => {
    mockFindMethods.mockResolvedValue(
      methods({
        confirmedAt: null,
        secretEncrypted: encryptSecret('secret'),
        lastUsedTimeStep: null,
      }),
    );
    (otplib.verify as jest.Mock).mockResolvedValue({
      valid: true,
      timeStep: 42,
    });
    mockConfirm.mockResolvedValue(false);

    await expect(service.confirmTotpSetup('user-1', '123456')).rejects.toThrow(
      /restarted/,
    );
  });

  it('등록을 시작하지 않았으면 거절한다', async () => {
    mockFindMethods.mockResolvedValue(methods(null));
    await expect(service.confirmTotpSetup('user-1', '123456')).rejects.toThrow(
      /not initiated/,
    );
  });
});
