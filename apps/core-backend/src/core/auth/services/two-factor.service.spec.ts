// otplib는 ESM-only 형태라 jest 환경에서 모킹 필수
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'secret'),
  generateURI: jest.fn(() => 'otpauth://test'),
  verify: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,test')),
}));

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TwoFactorService } from './two-factor.service';
import { PrismaService } from '@weaver2/prisma';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { jwtModuleOptions } from '../strategy/jwt-module-options';
import { encryptSecret } from '../utils/auth-crypto.util';
import * as otplib from 'otplib';

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
    );
  });

  it('발급한 pre-auth 토큰 → userId/rememberMe 반환', () => {
    const token = service.createPreAuthToken('user-1', true);
    expect(service.verifyPreAuthToken(token)).toEqual({
      userId: 'user-1',
      rememberMe: true,
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

describe('TwoFactorService TOTP 등록 — 켜진 TOTP 는 등록 경로가 덮지 않는다', () => {
  const ENCRYPTION_KEY = 'a'.repeat(64);
  let service: TwoFactorService;
  let prisma: {
    localCredential: { findUnique: jest.Mock; updateMany: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let originalKey: string | undefined;

  beforeAll(() => {
    originalKey = process.env.TOTP_ENCRYPTION_KEY;
    process.env.TOTP_ENCRYPTION_KEY = ENCRYPTION_KEY;
  });
  afterAll(() => {
    if (originalKey === undefined) delete process.env.TOTP_ENCRYPTION_KEY;
    else process.env.TOTP_ENCRYPTION_KEY = originalKey;
  });

  beforeEach(() => {
    prisma = {
      localCredential: { findUnique: jest.fn(), updateMany: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'a@b.c' }) },
    };
    service = new TwoFactorService(
      prisma as unknown as PrismaService,
      realJwt(),
      {} as EmailBusinessService,
    );
    (otplib.generateSecret as jest.Mock).mockReturnValue('secret');
    (otplib.generateURI as jest.Mock).mockReturnValue('otpauth://test');
  });

  it('켜져 있으면 등록 시작을 거절하고 아무것도 쓰지 않는다', async () => {
    prisma.localCredential.findUnique.mockResolvedValue({ totpEnabled: true });
    await expect(service.generateTotpSetup('user-1')).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.localCredential.updateMany).not.toHaveBeenCalled();
  });

  it('꺼져 있으면 「꺼져 있을 때만」 조건으로 새 비밀을 쓴다', async () => {
    prisma.localCredential.findUnique.mockResolvedValue({ totpEnabled: false });
    prisma.localCredential.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.generateTotpSetup('user-1');

    expect(result.secret).toBe('secret');
    expect(prisma.localCredential.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', totpEnabled: false },
      }),
    );
  });

  it('확인과 쓰기 사이에 켜졌으면(쓴 행 0) 거절한다', async () => {
    prisma.localCredential.findUnique.mockResolvedValue({ totpEnabled: false });
    prisma.localCredential.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.generateTotpSetup('user-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('등록 확인은 코드를 확인한 바로 그 비밀일 때만 켠다', async () => {
    const stored = encryptSecret('secret');
    prisma.localCredential.findUnique.mockResolvedValue({
      totpEnabled: false,
      totpSecret: stored,
    });
    (otplib.verify as jest.Mock).mockResolvedValue({ valid: true });
    prisma.localCredential.updateMany.mockResolvedValue({ count: 1 });

    await service.confirmTotpSetup('user-1', '123456');

    expect(prisma.localCredential.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', totpEnabled: false, totpSecret: stored },
      data: { totpEnabled: true },
    });
  });

  it('확인하는 사이 등록이 다시 시작됐으면(쓴 행 0) 켜지 않고 거절한다', async () => {
    prisma.localCredential.findUnique.mockResolvedValue({
      totpEnabled: false,
      totpSecret: encryptSecret('secret'),
    });
    (otplib.verify as jest.Mock).mockResolvedValue({ valid: true });
    prisma.localCredential.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.confirmTotpSetup('user-1', '123456')).rejects.toThrow(
      /restarted/,
    );
  });
});
