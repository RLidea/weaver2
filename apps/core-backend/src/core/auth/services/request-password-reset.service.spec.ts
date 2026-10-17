import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@weaver2/prisma';
import { RequestPasswordResetService } from './request-password-reset.service';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { OneTimeCodeService } from '../one-time-code/one-time-code.service';

jest.mock('../repositories/find-user-by-email.query', () => ({
  FindUserByEmailQuery: jest.fn(),
}));

import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';

describe('RequestPasswordResetService', () => {
  const mockFind = FindUserByEmailQuery as jest.Mock;
  let email: { sendPasswordResetEmail: jest.Mock };
  let oneTimeCode: { issueLink: jest.Mock };
  let service: RequestPasswordResetService;

  const owner = {
    id: 'user-1',
    email: 'owner@b.c',
    localCredential: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    email = { sendPasswordResetEmail: jest.fn() };
    oneTimeCode = { issueLink: jest.fn() };
    service = new RequestPasswordResetService(
      {} as PrismaService,
      email as unknown as EmailBusinessService,
      { get: () => 'https://app.example' } as unknown as ConfigService,
      oneTimeCode as unknown as OneTimeCodeService,
    );
  });

  it('링크를 발급해 저장된 주소로 보낸다', async () => {
    mockFind.mockResolvedValue(owner);
    oneTimeCode.issueLink.mockResolvedValue('tok');

    await service.execute({ email: 'OWNER@b.c' });

    expect(oneTimeCode.issueLink).toHaveBeenCalledWith(
      'user-1',
      'PASSWORD_RESET',
    );
    expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
      'owner@b.c',
      'https://app.example/reset-password?token=tok',
      'user-1',
    );
  });

  it('유예 중이면(발급 null) 보내지 않고 같은 응답 — 남이 주인의 복구 링크를 죽이지 못하게', async () => {
    mockFind.mockResolvedValue(owner);
    oneTimeCode.issueLink.mockResolvedValue(null);

    await expect(
      service.execute({ email: 'owner@b.c' }),
    ).resolves.toBeUndefined();
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('없는 이메일·로컬 자격 없는 계정은 아무것도 하지 않고 같은 응답 (열거 방지)', async () => {
    mockFind.mockResolvedValueOnce(null);
    await expect(
      service.execute({ email: 'none@b.c' }),
    ).resolves.toBeUndefined();

    mockFind.mockResolvedValueOnce({ ...owner, localCredential: null });
    await expect(
      service.execute({ email: 'oauth@b.c' }),
    ).resolves.toBeUndefined();

    expect(oneTimeCode.issueLink).not.toHaveBeenCalled();
  });
});
