import { Injectable } from '@nestjs/common';
import { EmailService as LibEmailService } from '@weaver2/email';
import { EmailStatus, Prisma } from '@weaver2/prisma';
import { EmailLogService } from './email-log.service';
import { EmailTemplateService } from './email-template.service';
import {
  SendBusinessEmailDto,
  SendTemplateEmailDto,
} from '../dto/send-business-email.dto';

/**
 * 서버 안에서만 정하는 발송 옵션 — 공개 DTO(관리자 발송 API)에 두면 호출자가 기록을 다르게 남길 수 있다.
 * sensitive: 본문에 살아 있는 비밀(재설정·인증 링크, 2FA·이메일 변경 코드)이 있다. 기록에 본문·변수를
 * 남기지 않고 재발송하지 않는다. subjectForLog: 그때 기록에 남길 제목(렌더 전 템플릿 제목)
 */
interface SensitiveMailOptions {
  sensitive?: boolean;
  subjectForLog?: string;
}

/** 비밀이 담긴 메일의 기록에 본문 대신 남기는 문구 */
const SENSITIVE_PLACEHOLDER =
  '[비밀(링크·코드)이 담긴 메일이라 본문을 저장하지 않습니다]';

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
  async sendEmail(
    dto: SendBusinessEmailDto,
    options: SensitiveMailOptions = {},
  ) {
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
    const { sensitive, subjectForLog } = options;

    // 1. 이메일 로그 생성 — 비밀이 담긴 메일은 본문을 남기지 않는다. 남기면 DB 를 읽을 수 있는 사람
    //    (이메일 기록을 보는 관리자 포함)이 살아 있는 재설정 링크로 남의 계정을 가져간다
    const emailLog = await this.emailLogService.createLog({
      to,
      from: from || '"Weaver2" <no-reply@weaver2.com>',
      // 제목도 템플릿 변수로 렌더되므로 비밀이 들어갈 수 있다 — 비밀 메일은 렌더 전 제목을 남긴다
      subject: sensitive ? (subjectForLog ?? subject) : subject,
      htmlContent: sensitive ? SENSITIVE_PLACEHOLDER : htmlContent,
      textContent: sensitive ? undefined : textContent,
      templateId,
      userId,
      metadata: sensitive ? { ...metadata, sensitive: true } : metadata,
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
  async sendTemplateEmail(
    dto: SendTemplateEmailDto,
    { sensitive }: Pick<SensitiveMailOptions, 'sensitive'> = {},
  ) {
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
    return this.sendEmail(
      {
        to,
        subject,
        htmlContent,
        textContent,
        from,
        templateId: template.id,
        userId,
        // 비밀이 담긴 메일은 변수(코드·링크)도 남기지 않는다
        metadata: {
          ...metadata,
          templateName,
          ...(!sensitive && { variables }),
        },
      },
      { sensitive, subjectForLog: template.subject },
    );
  }

  /**
   * 이메일 인증 메일 발송
   */
  async sendVerificationEmail(
    email: string,
    verificationLink: string,
    userId?: string,
  ) {
    return this.sendTemplateEmail(
      {
        to: email,
        templateName: 'email-verification',
        variables: {
          verificationLink,
        },
        userId,
      },
      { sensitive: true },
    );
  }

  /**
   * 비밀번호 재설정 메일 발송
   */
  async sendPasswordResetEmail(
    email: string,
    resetLink: string,
    userId?: string,
  ) {
    return this.sendTemplateEmail(
      {
        to: email,
        templateName: 'password-reset',
        variables: {
          resetLink,
        },
        userId,
      },
      { sensitive: true },
    );
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
    return this.sendTemplateEmail(
      {
        to: email,
        templateName: 'two-factor-code',
        variables: { code },
        userId,
      },
      { sensitive: true },
    );
  }

  /**
   * 2단계 인증이 꺼졌다는 알림 (비밀 없음)
   */
  async sendTwoFactorDisabledEmail(email: string, userId?: string) {
    return this.sendTemplateEmail({
      to: email,
      templateName: 'two-factor-disabled',
      variables: {},
      userId,
    });
  }

  /**
   * 이메일 변경 인증 코드 메일 발송
   */
  async sendEmailChangeVerificationEmail(
    newEmail: string,
    code: string,
    userId?: string,
  ) {
    return this.sendTemplateEmail(
      {
        to: newEmail,
        templateName: 'email-change',
        variables: { code },
        userId,
      },
      { sensitive: true },
    );
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

    // 본문을 남기지 않은 메일 — 다시 보낼 내용이 없고, 그 비밀은 사용자가 새로 받는다
    if ((emailLog.metadata as Prisma.JsonObject | null)?.sensitive === true) {
      throw new Error(
        'Sensitive emails (links/codes) are not stored and cannot be retried — ask the user to request a new one',
      );
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
