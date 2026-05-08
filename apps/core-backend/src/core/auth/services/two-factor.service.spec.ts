// otplib는 ESM-only 형태라 jest 환경에서 모킹 필수
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'secret'),
  generateURI: jest.fn(() => 'otpauth://test'),
  verify: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(async () => 'data:image/png;base64,test'),
}));

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TwoFactorService } from './two-factor.service';
import { PrismaService } from '@weaver2/prisma';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';

describe('TwoFactorService.verifyPreAuthToken', () => {
  let service: TwoFactorService;
  let jwt: { sign: jest.Mock; verify: jest.Mock };

  beforeEach(() => {
    jwt = { sign: jest.fn(), verify: jest.fn() };
    service = new TwoFactorService(
      {} as PrismaService,
      jwt as unknown as JwtService,
      {} as EmailBusinessService,
    );
  });

  it('정상 pre-auth 토큰 → userId/rememberMe 반환', () => {
    jwt.verify.mockReturnValue({
      sub: 'user-1',
      type: 'pre-auth',
      rememberMe: true,
    });

    const result = service.verifyPreAuthToken('tok');
    expect(result).toEqual({ userId: 'user-1', rememberMe: true });
  });

  it('rememberMe 미지정 시 false', () => {
    jwt.verify.mockReturnValue({ sub: 'user-1', type: 'pre-auth' });
    const result = service.verifyPreAuthToken('tok');
    expect(result.rememberMe).toBe(false);
  });

  it('type 불일치 → UnauthorizedException (다른 종류 토큰 차단)', () => {
    jwt.verify.mockReturnValue({ sub: 'user-1', type: 'access' });

    expect(() => service.verifyPreAuthToken('tok')).toThrow(
      UnauthorizedException,
    );
  });

  it('jwt 검증 실패(만료/위조) → UnauthorizedException', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    expect(() => service.verifyPreAuthToken('tok')).toThrow(
      /expired pre-auth/,
    );
  });
});
