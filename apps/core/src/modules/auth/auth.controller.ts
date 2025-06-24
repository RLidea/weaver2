// auth.controller.ts
import { Controller, Post, Req, UseGuards, Body } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Request } from 'express';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiOperationWithPublic } from '@weaver2/common/decorator/swagger/api-operation-with-public.decorator';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { AuthService } from './auth.service';
import { EmailSignUpDto } from './dto/email-sign-up.dto';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: `weaver@weaver.com`,
        },
        password: {
          type: 'string',
          example: '',
        },
      },
    },
  })
  @ApiOperationWithPublic({
    summary: 'email, password 로그인',
  })
  emailLogin(@Req() req: Request) {
    console.log('# login');
    return this.authService.login(req.user, 'email');
  }

  @Post('refresh')
  refresh(@Body() { refreshToken }: { refreshToken: string }) {
    return this.authService.refresh(refreshToken);
  }

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
    return this.authService.emailSignUp(dto);
  }
}
