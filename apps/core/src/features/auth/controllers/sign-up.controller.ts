import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { EmailSignUpDto } from '../dto/email-sign-up.dto';
import { SignUpService } from '../services/sign-up.service';
import { Throttle } from '@nestjs/throttler';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class SignUpController {
  constructor(private readonly signUpService: SignUpService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('sign-up/email')
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: `username@weaver.com`,
        },
        username: {
          type: 'string',
          example: 'username',
        },
        displayName: {
          type: 'string',
          example: 'displayName',
        },
        password: {
          type: 'string',
          example: '',
        },
      },
    },
  })
  @ApiOperation({ summary: '이메일/비밀번호 회원가입' })
  emailSignUp(@Body() dto: EmailSignUpDto) {
    return this.signUpService.emailSignUp(dto);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('verify/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '이메일 인증 메일 재발송' })
  resendVerificationEmail(@Body() dto: RequestPasswordResetDto) {
    return this.signUpService.resendVerificationEmail(dto.email);
  }

  @Public()
  @Get('verify')
  @ApiOperation({ summary: '이메일 인증 토큰 검증' })
  verifyEmail(@Query('token') token: string) {
    return this.signUpService.verifyEmail(token);
  }
}
