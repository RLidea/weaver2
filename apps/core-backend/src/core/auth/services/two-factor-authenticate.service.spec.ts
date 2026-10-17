// otplib는 ESM-only 형태라 jest 환경에서 모킹 필수
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}));
jest.mock('qrcode', () => ({ toDataURL: jest.fn() }));
jest.mock('../utils/auth-crypto.util', () => ({
  encryptSecret: jest.fn((s: string) => s),
  decryptSecret: jest.fn((s: string) => s),
  isEncryptedSecret: jest.fn(() => true),
}));
jest.mock('../repositories/find-two-factor-methods.query', () => ({
  FindTwoFactorMethodsQuery: jest.fn(),
}));
jest.mock('../repositories/record-totp-time-step.command', () => ({
  RecordTotpTimeStepCommand: jest.fn(),
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
jest.mock('../repositories/delete-two-factor-method.command', () => ({
  DeleteTwoFactorMethodCommand: jest.fn(),
}));
jest.mock('../repositories/enable-email-two-factor.command', () => ({
  EnableEmailTwoFactorCommand: jest.fn(),
}));

import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@weaver2/prisma';
import { verify as otpVerify } from 'otplib';
import { TwoFactorService } from './two-factor.service';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { OneTimeCodeService } from '../one-time-code/one-time-code.service';
import { FindTwoFactorMethodsQuery } from '../repositories/find-two-factor-methods.query';
import { RecordTotpTimeStepCommand } from '../repositories/record-totp-time-step.command';
import { ReserveAuthAttemptCommand } from '../repositories/reserve-auth-attempt.command';
import { ResetAuthAttemptsCommand } from '../repositories/reset-auth-attempts.command';
import { DeleteTwoFactorMethodCommand } from '../repositories/delete-two-factor-method.command';
import { EnableEmailTwoFactorCommand } from '../repositories/enable-email-two-factor.command';

const mockFindCredential = FindTwoFactorMethodsQuery as jest.Mock;
const mockRecordStep = RecordTotpTimeStepCommand as jest.Mock;
const mockReserve = ReserveAuthAttemptCommand as jest.Mock;
const mockReset = ResetAuthAttemptsCommand as jest.Mock;
const mockOtpVerify = otpVerify as jest.Mock;

// 확인된 TOTP 와 이메일 2FA 를 둘 다 가진 사람
const totpMethod = {
  kind: 'TOTP',
  secretEncrypted: 'v1:secret',
  lastUsedTimeStep: 10,
  confirmedAt: new Date(),
};
const credential = () => ({
  totp: totpMethod,
  confirmedTotp: totpMethod,
  email: { kind: 'EMAIL', confirmedAt: new Date() },
});

function build() {
  const oneTimeCode = {
    issueCode: jest.fn(),
    verifyCode: jest.fn(),
    deliverOrRevoke: jest.fn(
      (_u: string, _p: string, send: () => Promise<unknown>) => send(),
    ),
  };
  const email = { sendTwoFactorCodeEmail: jest.fn() };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 'a@b.c' }),
    },
    oneTimeCode: { deleteMany: jest.fn() },
  };
  const jwt = {
    verify: jest.fn(() => ({ sub: 'user-1' })),
  } as unknown as JwtService;
  const service = new TwoFactorService(
    prisma as unknown as PrismaService,
    jwt,
    email as unknown as EmailBusinessService,
    oneTimeCode as unknown as OneTimeCodeService,
  );
  return { service, oneTimeCode, email, prisma };
}

/**
 * 2FA 실패도 비밀번호와 같은 잠금 카운터에 센다 — IP 별 throttle 만으로는 IP 를 바꿔 가며
 * 6자리 코드를 대입하는 것을 막지 못한다.
 */
describe('TwoFactorService.authenticate — 실패 잠금', () => {
  let ctx: ReturnType<typeof build>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordStep.mockResolvedValue(true);
    mockReserve.mockResolvedValue(true);
    mockReserve.mockResolvedValue(true);
    ctx = build();
  });

  it('TOTP 는 확인 전에 시도를 잡고, 틀리면 되돌리지 않는다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    mockOtpVerify.mockResolvedValue({ valid: false });

    await expect(
      ctx.service.authenticate('tok', 'totp', '000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockReserve).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'SECOND_FACTOR',
    );
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('이메일 코드도 시도를 잡고, 로그인 목적의 코드로만 확인하며, 틀리면 되돌리지 않는다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    ctx.oneTimeCode.verifyCode.mockResolvedValue(null);

    await expect(
      ctx.service.authenticate('tok', 'email', '000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockReserve).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'SECOND_FACTOR',
    );
    expect(ctx.oneTimeCode.verifyCode).toHaveBeenCalledWith(
      'user-1',
      'TWO_FACTOR_LOGIN',
      '000000',
    );
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('맞는 이메일 코드면 실패 횟수를 지운다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    ctx.oneTimeCode.verifyCode.mockResolvedValue({ newEmail: null });

    await expect(
      ctx.service.authenticate('tok', 'email', '123456'),
    ).resolves.toEqual({ userId: 'user-1', rememberMe: false });
    expect(mockReset).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'SECOND_FACTOR',
    );
  });

  it('시도를 잡지 못하면(잠김) 코드를 보지도 않고 거절한다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    mockReserve.mockResolvedValue(false);

    await expect(
      ctx.service.authenticate('tok', 'totp', '123456'),
    ).rejects.toThrow(/locked/);
    expect(mockOtpVerify).not.toHaveBeenCalled();
  });

  it('TOTP 는 이미 쓴 시간 단위 다음부터만 받는다 (afterTimeStep)', async () => {
    mockFindCredential.mockResolvedValue(credential());
    mockOtpVerify.mockResolvedValue({ valid: true, timeStep: 11 });

    await ctx.service.authenticate('tok', 'totp', '123456');

    expect(mockOtpVerify).toHaveBeenCalledWith(
      expect.objectContaining({ afterTimeStep: 10 }),
    );
    expect(mockRecordStep).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      11,
    );
  });

  it('같은 코드가 동시에 와서 시간 단위를 남기지 못했으면(진 쪽) 거절한다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    mockOtpVerify.mockResolvedValue({ valid: true, timeStep: 11 });
    mockRecordStep.mockResolvedValue(false);

    await expect(
      ctx.service.authenticate('tok', 'totp', '123456'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('기기 시계가 앞서 otplib 가 범위 초과로 던지면 틀린 코드로 다룬다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    const err = new Error('range');
    err.name = 'AfterTimeStepRangeExceededError';
    mockOtpVerify.mockRejectedValue(err);

    await expect(
      ctx.service.authenticate('tok', 'totp', '123456'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('맞는 코드면 그제야 실패 횟수를 지운다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    mockOtpVerify.mockResolvedValue({ valid: true, timeStep: 11 });

    await expect(
      ctx.service.authenticate('tok', 'totp', '123456'),
    ).resolves.toEqual({ userId: 'user-1', rememberMe: false });
    expect(mockReset).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'SECOND_FACTOR',
    );
  });
});

describe('TwoFactorService — 이메일 코드 발송', () => {
  let ctx: ReturnType<typeof build>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordStep.mockResolvedValue(true);
    mockReserve.mockResolvedValue(true);
    ctx = build();
  });

  it('로그인 코드는 이메일 2FA 가 켜져 있을 때 발급해 보낸다', async () => {
    mockFindCredential.mockResolvedValue(credential());
    ctx.oneTimeCode.issueCode.mockResolvedValue('012345');

    await ctx.service.sendEmailOtp('user-1');

    expect(ctx.oneTimeCode.issueCode).toHaveBeenCalledWith(
      'user-1',
      'TWO_FACTOR_LOGIN',
    );
    expect(ctx.email.sendTwoFactorCodeEmail).toHaveBeenCalledWith(
      'a@b.c',
      '012345',
      'user-1',
    );
  });

  it('유예 중이면(발급 null) 보내지 않고 429', async () => {
    mockFindCredential.mockResolvedValue(credential());
    ctx.oneTimeCode.issueCode.mockResolvedValue(null);

    await expect(ctx.service.sendEmailOtp('user-1')).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(ctx.email.sendTwoFactorCodeEmail).not.toHaveBeenCalled();
  });

  it('STEP_UP 코드는 로그인한 사용자에게 보낸다', async () => {
    ctx.oneTimeCode.issueCode.mockResolvedValue('654321');

    await ctx.service.sendStepUpCode('user-1');

    expect(ctx.oneTimeCode.issueCode).toHaveBeenCalledWith('user-1', 'STEP_UP');
    expect(ctx.email.sendTwoFactorCodeEmail).toHaveBeenCalledWith(
      'a@b.c',
      '654321',
      'user-1',
    );
  });

  it('이메일 2FA 등록 확인은 등록 목적의 코드만 받는다', async () => {
    ctx.oneTimeCode.verifyCode.mockResolvedValue(null);

    await expect(
      ctx.service.confirmEmailOtpSetup('user-1', '111111'),
    ).rejects.toThrow(/Invalid or expired/);
    expect(ctx.oneTimeCode.verifyCode).toHaveBeenCalledWith(
      'user-1',
      'TWO_FACTOR_SETUP',
      '111111',
    );
    expect(EnableEmailTwoFactorCommand).not.toHaveBeenCalled();
  });
});

describe('TwoFactorService — 해제', () => {
  let ctx: ReturnType<typeof build>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordStep.mockResolvedValue(true);
    mockReserve.mockResolvedValue(true);
    ctx = build();
    mockFindCredential.mockResolvedValue(credential());
  });

  it('인증 앱 코드가 맞으면 STEP_UP 코드를 보지 않는다', async () => {
    mockOtpVerify.mockResolvedValue({ valid: true, timeStep: 11 });

    await ctx.service.disableTotp('user-1', '123456');

    expect(ctx.oneTimeCode.verifyCode).not.toHaveBeenCalled();
    expect(DeleteTwoFactorMethodCommand).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'TOTP',
    );
  });

  it('인증 앱 코드가 아니면 메일로 받은 STEP_UP 코드로도 해제할 수 있다', async () => {
    mockOtpVerify.mockResolvedValue({ valid: false });
    ctx.oneTimeCode.verifyCode.mockResolvedValue({ newEmail: null });

    await ctx.service.disableEmailOtp('user-1', '654321');

    expect(ctx.oneTimeCode.verifyCode).toHaveBeenCalledWith(
      'user-1',
      'STEP_UP',
      '654321',
    );
    expect(DeleteTwoFactorMethodCommand).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'EMAIL',
    );
    expect(ctx.prisma.oneTimeCode.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        purpose: { in: ['TWO_FACTOR_LOGIN', 'TWO_FACTOR_SETUP'] },
      },
    });
  });

  it('둘 다 아니면 거절하고 아무것도 끄지 않는다', async () => {
    mockOtpVerify.mockResolvedValue({ valid: false });
    ctx.oneTimeCode.verifyCode.mockResolvedValue(null);

    await expect(
      ctx.service.disableTotp('user-1', '000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(DeleteTwoFactorMethodCommand).not.toHaveBeenCalled();
  });
});
