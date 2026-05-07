import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { RequirePermission } from '../../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { ApiExcludeController } from '@nestjs/swagger';

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
    res.sendFile(
      join(
        process.cwd(),
        'apps/core-backend/src/assets/admin',
        'admin-security.html',
      ),
    );
  }
}
