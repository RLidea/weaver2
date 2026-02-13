import { Controller, Get, Logger, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { join } from 'path';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';
import { SignInService } from '../../../../features/auth/services/sign-in.service';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller({ path: 'admin' })
export class AdminAuthViewController {
  private readonly logger = new Logger(AdminAuthViewController.name);

  constructor(
    private readonly signInService: SignInService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('login')
  async getLoginPageUnauthenticated(
    @Req() req: Request,
    @Res() res: Response,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    this.logger.debug(JSON.stringify(authUser));

    // HttpOnly 쿠키에서 refresh token 확인
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.refresh_token;

    if (refreshToken && typeof refreshToken === 'string') {
      try {
        // refresh token으로 새로운 access token 발급
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const result = (await (this.signInService as any).refresh(
          refreshToken,
        )) as { accessToken: string };

        if (result?.accessToken) {
          // 새로운 access token을 쿠키에 설정
          res.cookie('access_token', result.accessToken, {
            httpOnly: true,
            secure: this.configService.get('NODE_ENV') === 'production',
            path: '/',
            maxAge: 15 * 60 * 1000, // 15분
          });

          this.logger.debug(
            'Valid refresh token found, new access token issued, redirecting to dashboard',
          );
          return res.redirect('/admin/dashboard');
        }
      } catch {
        this.logger.debug('Invalid refresh token, clearing cookies');
        // 무효한 토큰이면 쿠키 삭제
        res.clearCookie('refresh_token');
        res.clearCookie('access_token');
      }
    }

    // 토큰이 없거나 무효하면 로그인 페이지 렌더링
    res.sendFile(
      join(process.cwd(), 'apps/core/src/assets/admin', 'admin-login.html'),
    );
  }

  @Public()
  @Get('request-password-reset')
  getRequestPasswordResetPage(@Res() res: Response) {
    res.sendFile(
      join(
        process.cwd(),
        'apps/core/src/assets/admin',
        'request-password-reset.html',
      ),
    );
  }

  @Public()
  @Get('reset-password')
  getResetPasswordPage(@Res() res: Response) {
    res.sendFile(
      join(process.cwd(), 'apps/core/src/assets', 'reset-password.html'),
    );
  }
}
