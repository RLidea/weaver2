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
jest.mock('../repositories/reserve-login-attempt.command', () => ({
  ReserveLoginAttemptCommand: jest.fn(),
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
import { ReserveLoginAttemptCommand } from '../repositories/reserve-login-attempt.command';
import { ResetFailedAttemptsCommand } from '../repositories/reset-failed-attempts.command';
import { FindTwoFactorChallengeQuery } from '../repositories/find-two-factor-challenge.query';

/**
 * 2FA 실패도 비밀번호와 같은 잠금 카운터에 센다 — IP 별 throttle 만으로는 IP 를 바꿔 가며
 * 6자리 코드를 대입하는 것을 막지 못한다.
 */
describe('TwoFactorService.authenticate — 실패 잠금', () => {
  const mockFindCredential = FindLocalCredentialByUserIdQuery as jest.Mock;
  const mockReserve = ReserveLoginAttemptCommand as jest.Mock;
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
    mockReserve.mockResolvedValue(true);
    const jwt = {
      verify: jest.fn(() => ({ sub: 'user-1' })),
    } as unknown as JwtService;
    service = new TwoFactorService(
      {} as PrismaService,
      jwt,
      {} as EmailBusinessService,
    );
  });

  it('TOTP 는 확인 전에 시도를 잡고, 틀리면 되돌리지 않는다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    mockOtpVerify.mockResolvedValue({ valid: false });

    await expect(
      service.authenticate('tok', 'totp', '000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockReserve).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('이메일 OTP 도 시도를 잡고, 틀리면 되돌리지 않는다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    mockFindChallenge.mockResolvedValue({ codeHash: 'h' });
    mockCompare.mockResolvedValue(false);

    await expect(
      service.authenticate('tok', 'email', '000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockReserve).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('시도를 잡지 못하면(잠김) 코드를 보지도 않고 거절한다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    mockReserve.mockResolvedValue(false);

    await expect(service.authenticate('tok', 'totp', '123456')).rejects.toThrow(
      /locked/,
    );
    expect(mockOtpVerify).not.toHaveBeenCalled();
  });

  it('맞는 코드면 그제야 실패 횟수를 지운다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    mockOtpVerify.mockResolvedValue({ valid: true });

    await expect(
      service.authenticate('tok', 'totp', '123456'),
    ).resolves.toEqual({ userId: 'user-1', rememberMe: false });
    expect(mockReset).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });
});
