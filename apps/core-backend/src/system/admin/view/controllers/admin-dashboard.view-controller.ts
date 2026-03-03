import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { RequirePermission } from '../../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller({ path: 'admin' })
@RequirePermission(PERMISSIONS.ADMIN.ACCESS)
export class AdminDashboardViewController {
  @Get()
  toDashboard(@Res() res: Response) {
    return res.redirect('/admin/dashboard');
  }

  @Get('dashboard')
  getDashboardPage(@Res() res: Response) {
    res.sendFile(
      join(
        process.cwd(),
        'apps/core-backend/src/assets/admin',
        'admin-dashboard.html',
      ),
    );
  }

  @Get('user-management')
  getUserManagementPage(@Res() res: Response) {
    res.sendFile(
      join(
        process.cwd(),
        'apps/core-backend/src/assets/admin',
        'admin-user-management.html',
      ),
    );
  }

  @Get('analytics')
  getAnalyticsPage(@Res() res: Response) {
    res.sendFile(
      join(
        process.cwd(),
        'apps/core-backend/src/assets/admin',
        'admin-analytics.html',
      ),
    );
  }

  @Get('content-management')
  getContentManagementPage(@Res() res: Response) {
    res.sendFile(
      join(
        process.cwd(),
        'apps/core-backend/src/assets/admin',
        'admin-content-management.html',
      ),
    );
  }

  @Get('notifications')
  getNotificationsPage(@Res() res: Response) {
    res.sendFile(
      join(
        process.cwd(),
        'apps/core-backend/src/assets/admin',
        'admin-notifications.html',
      ),
    );
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

  @Get('system-settings')
  getSystemSettingsPage(@Res() res: Response) {
    res.sendFile(
      join(
        process.cwd(),
        'apps/core-backend/src/assets/admin',
        'admin-system-settings.html',
      ),
    );
  }
}
