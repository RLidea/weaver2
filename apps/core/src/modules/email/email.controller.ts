import { Body, Controller, Post } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { verifyEmailTemplate } from './templates/verify-email.template';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post()
  @ApiOperation({ summary: '이메일 발송' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          example: `weaver@weaver.com`,
        },
        subject: {
          type: 'string',
          example: verifyEmailTemplate({
            verificationToken: 'sample',
            expiresAt: new Date(),
          }).subject,
        },
        html: {
          type: 'string',
          example: verifyEmailTemplate({
            verificationToken: 'sample',
            expiresAt: new Date(),
          }).html,
        },
      },
    },
  })
  sendEmail(@Body() dto: SendEmailDto) {
    return this.emailService.sendMail(dto);
  }
}
