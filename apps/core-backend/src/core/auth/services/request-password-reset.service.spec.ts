import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@weaver2/prisma';
import { RequestPasswordResetService } from './request-password-reset.service';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';

jest.mock('../repositories/find-user-by-email.query', () => ({
  FindUserByEmailQuery: jest.fn(),
}));
jest.mock(
  '../repositories/update-local-credential-reset-token.command',
  () => ({
    UpdateLocalCredentialResetTokenCommand: jest.fn(),
  }),
);

import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { UpdateLocalCredentialResetTokenCommand } from '../repositories/update-local-credential-reset-token.command';

describe('RequestPasswordResetService', () => {
  const HOUR = 60 * 60 * 1000;
  const MINUTE = 60 * 1000;
  const mockFind = FindUserByEmailQuery as jest.Mock;
  const mockSaveToken = UpdateLocalCredentialResetTokenCommand as jest.Mock;
  let email: { sendPasswordResetEmail: jest.Mock };
  let service: RequestPasswordResetService;

  const userWithResetExpiry = (resetTokenExpiry: Date | null) => ({
    id: 'user-1',
    email: 'owner@b.c',
    localCredential: { resetTokenExpiry },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    email = { sendPasswordResetEmail: jest.fn() };
    service = new RequestPasswordResetService(
      {} as PrismaService,
      email as unknown as EmailBusinessService,
      { get: () => 'https://app.example' } as unknown as ConfigService,
    );
  });

  it('살아 있는 토큰이 없으면 새로 발급해 보낸다', async () => {
    mockFind.mockResolvedValue(userWithResetExpiry(null));

    await service.execute({ email: 'owner@b.c' });

    expect(mockSaveToken).toHaveBeenCalledTimes(1);
    expect(email.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('10분 안에 보낸 링크가 있으면 덮어쓰지 않는다 (남이 주인의 복구 링크를 죽이지 못하게)', async () => {
    // 3분 전에 발급 → 만료는 57분 뒤
    mockFind.mockResolvedValue(
      userWithResetExpiry(new Date(Date.now() + HOUR - 3 * MINUTE)),
    );

    await service.execute({ email: 'owner@b.c' });

    expect(mockSaveToken).not.toHaveBeenCalled();
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('10분이 지났으면 새로 발급한다', async () => {
    mockFind.mockResolvedValue(
      userWithResetExpiry(new Date(Date.now() + HOUR - 11 * MINUTE)),
    );

    await service.execute({ email: 'owner@b.c' });

    expect(mockSaveToken).toHaveBeenCalledTimes(1);
  });

  it('없는 이메일은 아무것도 하지 않고 같은 응답 (열거 방지)', async () => {
    mockFind.mockResolvedValue(null);

    await expect(
      service.execute({ email: 'none@b.c' }),
    ).resolves.toBeUndefined();
    expect(mockSaveToken).not.toHaveBeenCalled();
  });
});
