import { EmailStatus } from '@weaver2/prisma';
import { EmailService as LibEmailService } from '@weaver2/email';
import { EmailBusinessService } from './email-business.service';
import { EmailLogService } from './email-log.service';
import { EmailTemplateService } from './email-template.service';

/**
 * 비밀(재설정·인증 링크, 2FA·이메일 변경 코드)이 담긴 메일은 발송 기록에 본문·변수를 남기지 않는다.
 * 남기면 DB 를 읽을 수 있는 사람 — 이메일 기록을 보는 관리자 포함 — 이 살아 있는 링크로 남의 계정을 가져간다.
 */
describe('EmailBusinessService — 비밀이 담긴 메일의 기록', () => {
  const RESET_LINK = 'https://app.example.com/reset-password?token=live-secret';
  let createLog: jest.Mock;
  let service: EmailBusinessService;

  beforeEach(() => {
    createLog = jest.fn().mockResolvedValue({ id: 'log-1' });
    const logs = {
      createLog,
      markAsSent: jest.fn(),
      markAsFailed: jest.fn(),
      findById: jest.fn(),
    } as unknown as EmailLogService;
    const templates = {
      findTemplateByName: jest.fn().mockResolvedValue({
        id: 'tpl-1',
        subject: '재설정',
        htmlContent: '<a href="{{resetLink}}">재설정</a> {{code}}',
        textContent: '{{resetLink}} {{code}}',
      }),
      renderTemplate: (tpl: string, vars: Record<string, string>) =>
        tpl.replace(/{{(\w+)}}/g, (_, k: string) => vars[k] ?? ''),
    } as unknown as EmailTemplateService;
    const mailer = {
      sendMail: jest.fn().mockResolvedValue({ success: true }),
    } as unknown as LibEmailService;
    service = new EmailBusinessService(mailer, logs, templates);
  });

  function logged() {
    return JSON.stringify(createLog.mock.calls[0][0]);
  }

  it('재설정 링크는 기록의 본문·텍스트·변수 어디에도 남지 않는다', async () => {
    await service.sendPasswordResetEmail('a@b.c', RESET_LINK, 'u1');
    expect(logged()).not.toContain('live-secret');
    expect(createLog.mock.calls[0][0]).toMatchObject({
      metadata: { sensitive: true, templateName: 'password-reset' },
    });
  });

  it('2FA·이메일 변경 코드도 남지 않는다', async () => {
    await service.sendTwoFactorCodeEmail('a@b.c', '483920', 'u1');
    await service.sendEmailChangeVerificationEmail('n@b.c', '771205', 'u1');
    expect(JSON.stringify(createLog.mock.calls)).not.toMatch(/483920|771205/);
  });

  it('비밀이 없는 메일(환영)은 그대로 남는다', async () => {
    await service.sendWelcomeEmail('a@b.c', 'Weaver', 'u1');
    expect(createLog.mock.calls[0][0]).toMatchObject({
      metadata: { variables: { displayName: 'Weaver' } },
    });
  });

  it('본문을 남기지 않은 메일은 재발송하지 않는다', async () => {
    const logs = (service as unknown as { emailLogService: EmailLogService })
      .emailLogService as unknown as { findById: jest.Mock };
    logs.findById.mockResolvedValue({
      id: 'log-1',
      status: EmailStatus.FAILED,
      metadata: { sensitive: true },
    });
    await expect(service.retryFailedEmail('log-1')).rejects.toThrow(
      /cannot be retried/,
    );
  });
});
