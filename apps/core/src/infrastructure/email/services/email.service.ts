import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { sendPasswordResetEmail } from '../templates/send-password-reset-email';
import { ConfigService } from '@nestjs/config';

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

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }) {
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!user || !pass) {
      throw new Error('SMTP credentials are missing!');
    }

    try {
      this.transporter.verify((err) => {
        if (err) {
          console.error('SMTP 연결 실패:', err);
          throw new InternalServerErrorException('Failed connect SMTP server.');
        }
      });

      await this.transporter.sendMail({
        from: options.from ?? `"Weaver2" <no-reply@weaver2.com>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (err) {
      console.error('이메일 전송 실패:', err);
      throw new InternalServerErrorException('Failed to send email.');
    }
  }

  async sendVerificationEmail(email: string, verificationLink: string) {
    const subject = '[Weaver2] 이메일 인증 안내';
    const html = `
      <p>Weaver2에 오신 것을 환영합니다! 아래 링크를 클릭하여 이메일 인증을 완료해주세요.</p>
      <a href="${verificationLink}">이메일 인증하기</a>
    `;
    await this.sendMail({ to: email, subject, html });
  }

  async sendPasswordResetEmail(email: string, resetLink: string) {
    await sendPasswordResetEmail(this, email, resetLink);
  }
}
