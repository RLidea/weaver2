import { Controller, Get, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';

@Controller({ path: 'admin' })
export class AdminAuthViewController {
  private readonly logger = new Logger(AdminAuthViewController.name);

  @Public()
  @Get('login')
  getLoginPageUnauthenticated(
    @Res() res: Response,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    this.logger.debug(JSON.stringify(authUser));
    if (authUser && authUser.isLogin) return res.redirect('/admin/dashboard');
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
