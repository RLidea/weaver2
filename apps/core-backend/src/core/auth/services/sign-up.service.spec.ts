import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@weaver2/prisma';
import { SignUpService } from './sign-up.service';
import { FindUserService } from '../../user/services/find-user.service';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { TermsService } from '../../terms/services/terms.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('../repositories/find-local-credential-by-token.query', () => ({
  FindLocalCredentialByTokenQuery: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { FindLocalCredentialByTokenQuery } from '../repositories/find-local-credential-by-token.query';

describe('SignUpService.verifyEmail', () => {
  const mockFind = FindLocalCredentialByTokenQuery as jest.Mock;
  const mockCompare = bcrypt.compare as jest.Mock;
  let prisma: {
    localCredential: { update: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let email: { sendWelcomeEmail: jest.Mock };
  let service: SignUpService;

  const credential = (overrides: Record<string, unknown> = {}) => ({
    id: 'cred-1',
    userId: 'user-1',
    password: 'hashed:owner-pw',
    verificationTokenExpiry: new Date(Date.now() + 60_000),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      localCredential: { update: jest.fn() },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'a@b.c',
          displayName: 'A',
        }),
      },
    };
    email = { sendWelcomeEmail: jest.fn() };
    service = new SignUpService(
      prisma as unknown as PrismaService,
      {} as JwtService,
      {} as ConfigService,
      {} as FindUserService,
      email as unknown as EmailBusinessService,
      {} as TermsService,
    );
  });

  it('토큰과 가입 때 비밀번호가 맞으면 인증한다', async () => {
    mockFind.mockResolvedValue(credential());
    mockCompare.mockResolvedValue(true);

    await service.verifyEmail('tok', 'owner-pw');

    expect(mockCompare).toHaveBeenCalledWith('owner-pw', 'hashed:owner-pw');
    expect(prisma.localCredential.update).toHaveBeenCalledWith({
      where: { id: 'cred-1' },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });
  });

  it('비밀번호가 틀리면 인증하지 않고 토큰도 남긴다 (선점 가입 탈취 방지)', async () => {
    mockFind.mockResolvedValue(credential());
    mockCompare.mockResolvedValue(false);

    await expect(service.verifyEmail('tok', 'guess')).rejects.toThrow(
      'VERIFY_PASSWORD_MISMATCH',
    );
    expect(prisma.localCredential.update).not.toHaveBeenCalled();
    expect(email.sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it('자격 증명에 비밀번호가 없으면 인증하지 않는다', async () => {
    mockFind.mockResolvedValue(credential({ password: null }));

    await expect(service.verifyEmail('tok', 'anything')).rejects.toThrow(
      'VERIFY_PASSWORD_MISMATCH',
    );
    expect(mockCompare).not.toHaveBeenCalled();
    expect(prisma.localCredential.update).not.toHaveBeenCalled();
  });

  it('만료된 토큰은 비밀번호를 보기 전에 거절한다', async () => {
    mockFind.mockResolvedValue(
      credential({ verificationTokenExpiry: new Date(Date.now() - 1) }),
    );

    await expect(service.verifyEmail('tok', 'owner-pw')).rejects.toThrow(
      /expired/,
    );
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it('없는 토큰은 거절한다', async () => {
    mockFind.mockResolvedValue(null);

    await expect(
      service.verifyEmail('nope', 'owner-pw'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
