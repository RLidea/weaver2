// auth.controller.ts
import { Controller, Post, Req, UseGuards, Body } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Request } from 'express';
import {
  // ApiBearerAuth,
  ApiBody,
  // ApiExcludeEndpoint,
  // ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOperationWithPublic } from '@weaver2/common/decorator/swagger/api-operation-with-public.decorator';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { AuthService } from './auth.service';

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
  login(@Req() req: Request) {
    return this.authService.emailLogin(req.user);
  }

  @Post('refresh')
  refresh(@Body() { refreshToken }: { refreshToken: string }) {
    return this.authService.refresh(refreshToken);
  }
}
