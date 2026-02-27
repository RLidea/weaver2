import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { Request } from 'express';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class CsrfController {
  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: 'CSRF 토큰 발급' })
  getCsrfToken(@Req() req: Request) {
    return {
      message: 'CSRF token issued',
      data: { csrfToken: req.csrfToken() },
    };
  }
}
