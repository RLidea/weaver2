import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

const mockConfigService = {
  get: (key: string) => {
    const env: Record<string, string> = {
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'test@example.com',
      SMTP_PASS: 'password',
    };
    return env[key];
  },
};

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('EmailService (SMTP 미설정)', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('SMTP 환경변수가 없어도 부팅(인스턴스화)에 성공한다', () => {
    expect(service).toBeDefined();
  });

  it('sendMail은 발송을 스킵하고 실패 결과를 반환한다', async () => {
    const result = await service.sendMail({
      to: 'user@example.com',
      subject: 'test',
      html: '<p>test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('SMTP is not configured');
  });

  it('스킵 경고에 제목·수신자를 남기지 않는다 — 제목에 인증 코드가 들 수 있다', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await service.sendMail({
      to: 'user@example.com',
      subject: '로그인 코드 482913',
      html: '<p>test</p>',
    });

    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain('482913');
    expect(logged).not.toContain('user@example.com');
    warn.mockRestore();
  });

  it('verifyConnection은 false를 반환한다', async () => {
    await expect(service.verifyConnection()).resolves.toBe(false);
  });
});
