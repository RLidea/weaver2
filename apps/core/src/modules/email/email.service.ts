import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT!),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }) {
    console.log('SMTP_USER:', JSON.stringify(process.env.SMTP_USER));
    console.log('SMTP_PASS:', JSON.stringify(process.env.SMTP_PASS));
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      throw new Error('SMTP credentials are missing!');
    }

    try {
      this.transporter.verify((err, success) => {
        console.log('#success:' + success);
        if (err) {
          console.error('SMTP 연결 실패:', err);
          throw new InternalServerErrorException('Failed connect SMTP server.');
        } else {
          console.log('SMTP 연결 성공!');
        }
      });

      console.log(process.env.SMTP_USER);
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
}
