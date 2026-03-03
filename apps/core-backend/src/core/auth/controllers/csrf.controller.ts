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
    // message/data 래퍼 없이 반환 → SuccessInterceptor가
    // { message: 'success', data: { csrfToken: '...' } } 형태로 올바르게 감쌈
    return { csrfToken: req.csrfToken() };
  }
}
