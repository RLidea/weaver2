import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { SignInService } from '../../../auth/services/sign-in.service';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';

@Controller({ path: 'admin' })
export class AdminAuthViewController {
  constructor(private readonly signInService: SignInService) {}

  @Public()
  @Get('login')
  getLoginPageUnauthenticated(
    @Res() res: Response,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    if (authUser && authUser.isLogin) return res.redirect('/admin/dashboard');
    res.sendFile(
      join(process.cwd(), 'apps/core/src/public/admin', 'admin-login.html'),
    );
  }
}
