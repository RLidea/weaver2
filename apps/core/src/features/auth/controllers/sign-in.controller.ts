// auth.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Logger,
  Res,
  Req,
} from '@nestjs/common';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { SignInService } from '../services/sign-in.service';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class SignInController {
  constructor(
    private readonly signInService: SignInService,
    private readonly configService: ConfigService,
  ) {}
  private logger = new Logger(SignInController.name);
  /*
    Sign In
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
        rememberMe: {
          type: 'boolean',
          example: false,
          description: 'Keep user logged in for extended period',
        },
      },
    },
  })
  @ApiOperation({ summary: '이메일/비밀번호 로그인' })
  async emailLogin(
    @AuthUser() authUser: CommonAuthUserDto,
    @Body() loginDto: { rememberMe?: boolean },
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.debug(JSON.stringify(authUser));
    const { accessToken, refreshToken, tokenExpiry } =
      await this.signInService.login(authUser.id, 'email', loginDto.rememberMe);

    // Access Token 쿠키 설정
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15분
    });

    // Refresh Token 쿠키 설정 (Remember me에 따라 기간 조정)
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      path: '/',
      maxAge: tokenExpiry,
    });

    return { message: 'Login successful', data: { accessToken, refreshToken } };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'HttpOnly 쿠키의 리프레시 토큰으로 액세스 토큰 갱신',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      // HttpOnly 쿠키에서 refresh token 읽기
      const cookies = req.cookies as Record<string, string> | undefined;
      const refreshToken = cookies?.refresh_token;

      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new Error('Refresh token not found in cookies');
      }

      this.logger.debug(
        `Refreshing token for: ${refreshToken.substring(0, 10)}...`,
      );

      const { accessToken } = await this.signInService.refresh(refreshToken);

      // 새로운 Access Token 쿠키 설정
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        path: '/',
        maxAge: 15 * 60 * 1000, // 15분
      });

      return {
        message: 'Token refreshed successfully',
        data: { accessToken },
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', (error as Error).message);
      // Refresh token이 유효하지 않으면 쿠키 삭제
      res.clearCookie('refresh_token');
      res.clearCookie('access_token');
      throw error;
    }
  }
}
