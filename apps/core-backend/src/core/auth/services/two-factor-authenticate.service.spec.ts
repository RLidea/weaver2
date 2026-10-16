// otplib는 ESM-only 형태라 jest 환경에서 모킹 필수
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}));
jest.mock('qrcode', () => ({ toDataURL: jest.fn() }));
jest.mock('bcrypt', () => ({ compare: jest.fn() }));
jest.mock('../utils/auth-crypto.util', () => ({
  encryptSecret: jest.fn((s: string) => s),
  decryptSecret: jest.fn((s: string) => s),
  isEncryptedSecret: jest.fn(() => true),
}));
jest.mock('../repositories/find-local-credential-by-user-id.query', () => ({
  FindLocalCredentialByUserIdQuery: jest.fn(),
}));
jest.mock('../repositories/increment-failed-attempts.command', () => ({
  IncrementFailedAttemptsCommand: jest.fn(),
}));
jest.mock('../repositories/reset-failed-attempts.command', () => ({
  ResetFailedAttemptsCommand: jest.fn(),
}));
jest.mock('../repositories/find-two-factor-challenge.query', () => ({
  FindTwoFactorChallengeQuery: jest.fn(),
}));
jest.mock('../repositories/delete-two-factor-challenges.command', () => ({
  DeleteTwoFactorChallengesCommand: jest.fn(),
}));

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { verify as otpVerify } from 'otplib';
import { TwoFactorService } from './two-factor.service';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { FindLocalCredentialByUserIdQuery } from '../repositories/find-local-credential-by-user-id.query';
import { IncrementFailedAttemptsCommand } from '../repositories/increment-failed-attempts.command';
import { ResetFailedAttemptsCommand } from '../repositories/reset-failed-attempts.command';
import { FindTwoFactorChallengeQuery } from '../repositories/find-two-factor-challenge.query';

/**
 * 2FA 실패도 비밀번호와 같은 잠금 카운터에 센다 — IP 별 throttle 만으로는 IP 를 바꿔 가며
 * 6자리 코드를 대입하는 것을 막지 못한다.
 */
describe('TwoFactorService.authenticate — 실패 잠금', () => {
  const mockFindCredential = FindLocalCredentialByUserIdQuery as jest.Mock;
  const mockIncrement = IncrementFailedAttemptsCommand as jest.Mock;
  const mockReset = ResetFailedAttemptsCommand as jest.Mock;
  const mockFindChallenge = FindTwoFactorChallengeQuery as jest.Mock;
  const mockOtpVerify = otpVerify as jest.Mock;
  const mockCompare = bcrypt.compare as jest.Mock;
  let service: TwoFactorService;

  const credential = (overrides: Record<string, unknown> = {}) => ({
    totpEnabled: true,
    totpSecret: 'secret',
    emailOtpEnabled: true,
    lockedUntil: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const jwt = {
      verify: jest.fn(() => ({ sub: 'user-1', type: 'pre-auth' })),
    } as unknown as JwtService;
    service = new TwoFactorService(
      {} as PrismaService,
      jwt,
      {} as EmailBusinessService,
    );
  });

  it('틀린 TOTP 는 실패 횟수를 올린다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    mockOtpVerify.mockResolvedValue({ valid: false });

    await expect(
      service.authenticate('tok', 'totp', '000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockIncrement).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('틀린 이메일 OTP 도 실패 횟수를 올린다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    mockFindChallenge.mockResolvedValue({ codeHash: 'h' });
    mockCompare.mockResolvedValue(false);

    await expect(
      service.authenticate('tok', 'email', '000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockIncrement).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });

  it('잠긴 계정은 코드를 보지도 않고 거절한다', async () => {
    mockFindCredential.mockResolvedValue(
      credential({ lockedUntil: new Date(Date.now() + 60_000) }),
    );

    await expect(service.authenticate('tok', 'totp', '123456')).rejects.toThrow(
      /locked/,
    );
    expect(mockOtpVerify).not.toHaveBeenCalled();
    expect(mockIncrement).not.toHaveBeenCalled();
  });

  it('맞는 코드면 그제야 실패 횟수를 지운다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    mockOtpVerify.mockResolvedValue({ valid: true });

    await expect(
      service.authenticate('tok', 'totp', '123456'),
    ).resolves.toEqual({ userId: 'user-1', rememberMe: false });
    expect(mockReset).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockIncrement).not.toHaveBeenCalled();
  });
});
