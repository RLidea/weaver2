import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendEmailOptions, EmailResult } from './interfaces/email.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const portRaw = this.configService.get<string>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !portRaw || !user || !pass) {
      // SMTP 미설정 환경(로컬 첫 구동 등)에서도 부팅은 가능해야 한다 — 발송만 비활성화
      this.logger.warn(
        'SMTP 환경변수(SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)가 설정되지 않아 이메일 발송이 비활성화됩니다.',
      );
      return;
    }

    const port = parseInt(portRaw, 10);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  /**
   * 순수 이메일 발송 기능
   * 비즈니스 로직 없이 순수하게 이메일만 발송
   */
  async sendMail(options: SendEmailOptions): Promise<EmailResult> {
    const transporter = this.transporter;
    if (!transporter) {
      this.logger.warn(
        `SMTP 미설정으로 이메일 발송 스킵: ${options.subject} → ${options.to}`,
      );
      return {
        success: false,
        error: 'SMTP is not configured. Email sending is disabled.',
      };
    }

    try {
      // SMTP 연결 검증
      await new Promise<void>((resolve, reject) => {
        transporter.verify((err) => {
          if (err) {
            this.logger.error(
              'SMTP 연결 실패',
              err instanceof Error ? err.stack : String(err),
            );
            reject(
              new InternalServerErrorException(
                'Failed to connect SMTP server.',
              ),
            );
          } else {
            resolve();
          }
        });
      });

      // 이메일 발송
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await transporter.sendMail({
        from: options.from ?? `"Weaver2" <no-reply@weaver2.com>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      return {
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        messageId: String(result.messageId || ''),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        response: String(result.response || ''),
      };
    } catch (err) {
      this.logger.error(
        '이메일 전송 실패',
        err instanceof Error ? err.stack : String(err),
      );
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send email.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * SMTP 연결 상태 확인
   */
  async verifyConnection(): Promise<boolean> {
    const transporter = this.transporter;
    if (!transporter) {
      return false;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        transporter.verify((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      return true;
    } catch (err) {
      this.logger.error(
        'SMTP 연결 검증 실패',
        err instanceof Error ? err.stack : String(err),
      );
      return false;
    }
  }
}
