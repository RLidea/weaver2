// auth.controller.ts
import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiOperationWithPublic } from '@weaver2/common/decorator/swagger/api-operation-with-public.decorator';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { SignInService } from '../services/sign-in.service';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class SignInController {
  constructor(private readonly signInService: SignInService) {}

  /*
    Sign In
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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
  emailLogin(@AuthUser() authUser: CommonAuthUserDto) {
    return this.signInService.login(authUser.id, 'email');
  }

  @Post('refresh')
  refresh(@Body() { refreshToken }: { refreshToken: string }) {
    return this.signInService.refresh(refreshToken);
  }
}
