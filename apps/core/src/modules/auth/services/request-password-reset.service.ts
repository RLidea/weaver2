import { Injectable } from '@nestjs/common';
import { EmailService } from '../../email/email.service';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@weaver2/prisma';
import { generateTokenUtil } from '@weaver2/common/utility/generate-token.util';

@Injectable()
export class RequestPasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: RequestPasswordResetDto): Promise<void> {
    const { email } = dto;

    const auth = await this.prisma.auth.findUnique({ where: { email } });
    if (!auth) {
      // To prevent user enumeration attacks, we don't reveal that the user does not exist.
      // We just return successfully, as if an email was sent.
      return;
    }

    const token = generateTokenUtil();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1); // Token valid for 1 hour

    await this.prisma.auth.update({
      where: { id: auth.id },
      data: {
        passwordResetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    const resetLink = `${this.configService.get(
      'CLIENT_URL',
    )}/reset-password?token=${token}`;

    await this.emailService.sendPasswordResetEmail(auth.email, resetLink);
  }
}
