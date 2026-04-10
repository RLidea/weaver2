// auth.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Logger,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { SignInService } from '../services/sign-in.service';
import { TwoFactorService } from '../services/two-factor.service';
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
    private readonly twoFactorService: TwoFactorService,
    private readonly configService: ConfigService,
  ) {}
  private logger = new Logger(SignInController.name);

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string; tokenExpiry: number },
  ) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      path: '/',
      maxAge: tokens.tokenExpiry,
    });
  }

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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.debug(JSON.stringify(authUser));

    if (authUser.totpEnabled || authUser.emailOtpEnabled) {
      const preAuthToken = this.twoFactorService.createPreAuthToken(
        authUser.id,
        loginDto.rememberMe,
      );
      return {
        message: 'Two-factor authentication required',
        twoFactorRequired: true,
        preAuthToken,
        availableMethods: {
          totp: authUser.totpEnabled ?? false,
          email: authUser.emailOtpEnabled ?? false,
        },
      };
    }

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const tokens = await this.signInService.login(
      authUser.id,
      'email',
      loginDto.rememberMe,
      ipAddress,
      userAgent,
    );
    this.setAuthCookies(res, tokens);

    return {
      message: 'Login successful',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
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
        throw new UnauthorizedException('Refresh token not found in cookies');
      }

      this.logger.debug(
        `Refreshing token for: ${refreshToken.substring(0, 10)}...`,
      );

      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const tokens = await this.signInService.refresh(
        refreshToken,
        ipAddress,
        userAgent,
      );
      this.setAuthCookies(res, tokens);

      return {
        message: 'Token refreshed successfully',
        data: { accessToken: tokens.accessToken },
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', (error as Error).message);
      res.clearCookie('refresh_token');
      res.clearCookie('access_token');
      throw error;
    }
  }
}
