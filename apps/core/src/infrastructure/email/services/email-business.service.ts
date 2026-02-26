import { Injectable } from '@nestjs/common';
import { EmailService as LibEmailService } from '@weaver2/email';
import { EmailStatus, Prisma } from '@prisma/client';
import { EmailLogService } from './email-log.service';
import { EmailTemplateService } from './email-template.service';
import {
  SendBusinessEmailDto,
  SendTemplateEmailDto,
} from '../dto/send-business-email.dto';

@Injectable()
export class EmailBusinessService {
  constructor(
    private readonly libEmailService: LibEmailService,
    private readonly emailLogService: EmailLogService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  /**
   * 일반 이메일 발송 (DB 로깅 포함)
   */
  async sendEmail(dto: SendBusinessEmailDto) {
    const {
      to,
      subject,
      htmlContent,
      textContent,
      from,
      templateId,
      userId,
      metadata,
    } = dto;

    // 1. 이메일 로그 생성
    const emailLog = await this.emailLogService.createLog({
      to,
      from: from || '"Weaver2" <no-reply@weaver2.com>',
      subject,
      htmlContent,
      textContent,
      templateId,
      userId,
      metadata,
    });

    try {
      // 2. 실제 이메일 발송
      const result = await this.libEmailService.sendMail({
        to,
        subject,
        html: htmlContent,
        text: textContent,
        from,
      });

      // 3. 발송 성공 로그 업데이트
      if (result.success) {
        await this.emailLogService.markAsSent(emailLog.id);
        return { success: true, emailLogId: emailLog.id, result };
      } else {
        await this.emailLogService.markAsFailed(
          emailLog.id,
          result.error || 'Unknown error',
        );
        return { success: false, emailLogId: emailLog.id, error: result.error };
      }
    } catch (error) {
      // 4. 발송 실패 로그 업데이트
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.emailLogService.markAsFailed(emailLog.id, errorMessage);
      return { success: false, emailLogId: emailLog.id, error: errorMessage };
    }
  }

  /**
   * 템플릿 기반 이메일 발송
   */
  async sendTemplateEmail(dto: SendTemplateEmailDto) {
    const { to, templateName, variables, from, userId, metadata } = dto;

    // 1. 템플릿 조회
    const template =
      await this.emailTemplateService.findTemplateByName(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // 2. 템플릿 변수 치환
    const subject = this.emailTemplateService.renderTemplate(
      template.subject,
      variables,
    );
    const htmlContent = this.emailTemplateService.renderTemplate(
      template.htmlContent,
      variables,
    );
    const textContent = template.textContent
      ? this.emailTemplateService.renderTemplate(
          template.textContent,
          variables,
        )
      : undefined;

    // 3. 이메일 발송
    return this.sendEmail({
      to,
      subject,
      htmlContent,
      textContent,
      from,
      templateId: template.id,
      userId,
      metadata: {
        ...metadata,
        templateName,
        variables,
      },
    });
  }

  /**
   * 이메일 인증 메일 발송
   */
  async sendVerificationEmail(
    email: string,
    verificationLink: string,
    userId?: string,
  ) {
    return this.sendTemplateEmail({
      to: email,
      templateName: 'email-verification',
      variables: {
        verificationLink,
      },
      userId,
    });
  }

  /**
   * 비밀번호 재설정 메일 발송
   */
  async sendPasswordResetEmail(
    email: string,
    resetLink: string,
    userId?: string,
  ) {
    return this.sendTemplateEmail({
      to: email,
      templateName: 'password-reset',
      variables: {
        resetLink,
      },
      userId,
    });
  }

  /**
   * 환영 메일 발송
   */
  async sendWelcomeEmail(email: string, displayName: string, userId?: string) {
    return this.sendTemplateEmail({
      to: email,
      templateName: 'welcome',
      variables: {
        displayName,
      },
      userId,
    });
  }

  /**
   * 2단계 인증 코드 메일 발송
   */
  async sendTwoFactorCodeEmail(email: string, code: string, userId?: string) {
    return this.sendTemplateEmail({
      to: email,
      templateName: 'two-factor-code',
      variables: { code },
      userId,
    });
  }

  /**
   * 실패한 이메일 재발송
   */
  async retryFailedEmail(emailLogId: string) {
    const emailLog = await this.emailLogService.findById(emailLogId);

    if (!emailLog) {
      throw new Error('Email log not found');
    }

    if (emailLog.status !== EmailStatus.FAILED) {
      throw new Error('Only failed emails can be retried');
    }

    // 재발송 시도
    return this.sendEmail({
      to: emailLog.to,
      subject: emailLog.subject,
      htmlContent: emailLog.htmlContent,
      textContent: emailLog.textContent || undefined,
      from: emailLog.from,
      templateId: emailLog.templateId || undefined,
      userId: emailLog.userId || undefined,
      metadata: {
        ...(emailLog.metadata as Prisma.JsonObject),
        retryOf: emailLogId,
      },
    });
  }
}
