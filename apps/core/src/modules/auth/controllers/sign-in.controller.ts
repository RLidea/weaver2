// auth.controller.ts
import { Controller, Post, UseGuards, Body, Logger, Res } from '@nestjs/common';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiOperationWithPublic } from '@weaver2/common/decorator/swagger/api-operation-with-public.decorator';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { SignInService } from '../services/sign-in.service';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { Response } from 'express';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class SignInController {
  constructor(private readonly signInService: SignInService) {}
  private logger = new Logger(SignInController.name);
  /*
    Sign In
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('sign-in')
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
  async emailLogin(
    @AuthUser() authUser: CommonAuthUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.debug(JSON.stringify(authUser));
    const { accessToken, refreshToken } = await this.signInService.login(
      authUser.sub,
      'email',
    );
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return { message: 'Login successful', data: { accessToken, refreshToken } };
  }

  @Post('refresh')
  refresh(@Body() { refreshToken }: { refreshToken: string }) {
    return this.signInService.refresh(refreshToken);
  }
}
