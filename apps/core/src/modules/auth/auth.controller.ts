// auth.controller.ts
import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Response } from 'express';
import {
  // ApiBearerAuth,
  ApiBody,
  // ApiExcludeEndpoint,
  // ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOperationWithPublic } from '@weaver2/common/decorator/swagger/api-operation-with-public.decorator';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { CallbackUser } from '@weaver2/common/decorator/callback-user.decorator';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login(@CallbackUser() user: any, @Req() res: Response) {
    return;
  }
}
