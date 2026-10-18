import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { RequirePermission } from '../../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { ApiExcludeController } from '@nestjs/swagger';

// root 를 주는 이유는 admin-auth.view-controller.ts 의 ASSETS_ROOT 주석과 같다
const ADMIN_ASSETS_ROOT = join(
  process.cwd(),
  'apps/core-backend/src/assets/admin',
);

@ApiExcludeController()
@Controller({ path: 'admin' })
@RequirePermission(PERMISSIONS.ADMIN.SECURITY)
export class AdminDashboardViewController {
  @Get()
  toSecurity(@Res() res: Response) {
    return res.redirect('/admin/security');
  }

  @Get('security')
  getSecurityPage(@Res() res: Response) {
    res.sendFile('admin-security.html', { root: ADMIN_ASSETS_ROOT });
  }
}
