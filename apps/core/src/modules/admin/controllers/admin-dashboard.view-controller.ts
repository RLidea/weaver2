import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { Roles } from '../../../decorator/roles.decorator';
import { Role } from '@prisma/client';
import { AuthUser } from '@weaver2/common/decorator/auth-user.decorator';
import { CommonAuthUserDto } from '@weaver2/common/global/dto/common-auth-user.dto';

@Controller({ path: 'admin' })
@Roles(Role.ADMIN, Role.DEVELOPER)
export class AdminDashboardViewController {
  @Get()
  toDashboard(@Res() res: Response) {
    return res.redirect('/admin/dashboard');
  }

  @Get('dashboard')
  getDashboardPage(
    @Res() res: Response,
    @AuthUser() authUser: CommonAuthUserDto,
  ) {
    console.log(authUser);
    res.sendFile(
      join(process.cwd(), 'apps/core/src/public', 'admin-dashboard.html'),
    );
  }
}
