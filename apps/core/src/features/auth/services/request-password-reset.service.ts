import { Injectable } from '@nestjs/common';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@weaver2/prisma';
import { generateTokenUtil } from '@weaver2/common/utility/generate-token.util';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { UpdateLocalCredentialResetTokenCommand } from '../repositories/update-local-credential-reset-token.command';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';

@Injectable()
export class RequestPasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailBusinessService: EmailBusinessService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: RequestPasswordResetDto): Promise<void> {
    const { email } = dto;

    const user = await FindUserByEmailQuery(this.prisma, email);
    if (!user || !user.localCredential) {
      // To prevent user enumeration attacks, we don't reveal that the user does not exist.
      // We just return successfully, as if an email was sent.
      return;
    }

    const token = generateTokenUtil();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1); // Token valid for 1 hour

    await UpdateLocalCredentialResetTokenCommand(
      this.prisma,
      user.id,
      token,
      expiry,
    );

    const resetLink = `${this.configService.get(
      'CLIENT_URL',
    )}/reset-password?token=${token}`;

    await this.emailBusinessService.sendPasswordResetEmail(
      user.email,
      resetLink,
      user.id,
    );
  }
}
