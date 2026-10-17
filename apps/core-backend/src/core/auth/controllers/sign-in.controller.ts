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
import { SignInCompletionService } from '../services/sign-in-completion.service';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { setAuthCookies, clearAuthCookies } from '../utils/auth-cookie.util';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class SignInController {
  constructor(
    private readonly signInService: SignInService,
    private readonly signInCompletionService: SignInCompletionService,
    private readonly configService: ConfigService,
  ) {}
  private logger = new Logger(SignInController.name);

  private get isProduction(): boolean {
    return this.configService.get('NODE_ENV') === 'production';
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

    // 계정 상태·2FA·세션 발급은 모든 로그인 경로가 같은 곳에서 끝낸다
    const completion = await this.signInCompletionService.complete(
      authUser.id,
      {
        provider: 'email',
        rememberMe: loginDto.rememberMe ?? false,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      res,
    );
    if (completion.twoFactorRequired) {
      // pre-auth 토큰은 쿠키로만 나간다 — 본문에는 고를 수 있는 수단만
      return {
        message: 'Two-factor authentication required',
        twoFactorRequired: true,
        availableMethods: completion.availableMethods,
      };
    }

    // 토큰은 HttpOnly 쿠키로만 전달한다(응답 body에 평문 노출 금지).
    return { message: 'Login successful' };
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
      setAuthCookies(res, tokens, this.isProduction);

      return { message: 'Token refreshed successfully' };
    } catch (error) {
      this.logger.error('Token refresh failed:', (error as Error).message);
      clearAuthCookies(res, this.isProduction);
      throw error;
    }
  }
}
