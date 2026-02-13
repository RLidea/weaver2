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
  @ApiOperation({ summary: 'Sign up with email and password' })
  emailSignUp(@Body() dto: EmailSignUpDto) {
    return this.signUpService.emailSignUp(dto);
  }

  @Public()
  @Get('verify')
  @ApiOperation({ summary: 'Verify email address with token' })
  verifyEmail(@Query('token') token: string) {
    return this.signUpService.verifyEmail(token);
  }
}
