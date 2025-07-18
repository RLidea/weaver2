import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendEmailOptions, EmailResult } from './interfaces/email.interface';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_PORT') === 465,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  /**
   * 순수 이메일 발송 기능
   * 비즈니스 로직 없이 순수하게 이메일만 발송
   */
  async sendMail(options: SendEmailOptions): Promise<EmailResult> {
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!user || !pass) {
      throw new Error('SMTP credentials are missing!');
    }

    try {
      // SMTP 연결 검증
      await new Promise<void>((resolve, reject) => {
        this.transporter.verify((err) => {
          if (err) {
            console.error('SMTP 연결 실패:', err);
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
      const result = await this.transporter.sendMail({
        from: options.from ?? `"Weaver2" <no-reply@weaver2.com>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
      };
    } catch (err) {
      console.error('이메일 전송 실패:', err);
      return {
        success: false,
        error: err.message || 'Failed to send email.',
      };
    }
  }

  /**
   * SMTP 연결 상태 확인
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.transporter.verify((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      return true;
    } catch (err) {
      console.error('SMTP 연결 검증 실패:', err);
      return false;
    }
  }
}
