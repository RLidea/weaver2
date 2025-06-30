import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { ApiOperationWithPublic } from '@weaver2/common/decorator/swagger/api-operation-with-public.decorator';
import { EmailSignUpDto } from '../dto/email-sign-up.dto';
import { SignUpService } from '../services/sign-up.service';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class SignUpController {
  constructor(private readonly signUpService: SignUpService) {}

  @Public()
  @Post('sign-up/email')
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
          example: 'secret!!',
        },
      },
    },
  })
  @ApiOperationWithPublic({
    summary: 'email, password 회원가입',
  })
  emailSignUp(@Body() dto: EmailSignUpDto) {
    return this.signUpService.emailSignUp(dto);
  }

  @Get('verify')
  verifyEmail(@Query('token') token: string) {
    return this.signUpService.verifyEmail(token);
  }
}
