import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { csrfHandler } from '@weaver2/common/global/middleware/security.middleware';
import { Request, Response } from 'express';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class CsrfController {
  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: 'CSRF 토큰 발급' })
  getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // csrf-csrf는 cookie를 res에 설정하면서 동시에 토큰을 반환한다.
    // SuccessInterceptor가 { message: 'success', data: { csrfToken } } 형태로 감쌈.
    const csrfToken = csrfHandler.generateCsrfToken(req, res);
    return { csrfToken };
  }
}
