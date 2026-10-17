import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { EmailSignUpDto } from '../dto/email-sign-up.dto';
import { SignUpService } from '../services/sign-up.service';
import { Throttle } from '@nestjs/throttler';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';

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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '이메일 인증 (토큰 + 가입 때 정한 비밀번호)',
    description:
      '비밀번호가 틀리면 400 VERIFY_PASSWORD_MISMATCH — 본인이 가입하지 않았다면 비밀번호 재설정으로 계정을 되찾는다(재설정이 인증까지 끝낸다).',
  })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.signUpService.verifyEmail(dto.token, dto.password);
  }
}
