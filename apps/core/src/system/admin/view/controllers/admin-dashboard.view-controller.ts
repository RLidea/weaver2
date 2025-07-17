import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller({ path: 'admin' })
@Roles(Role.ADMIN, Role.DEVELOPER)
export class AdminDashboardViewController {
  @Get()
  toDashboard(@Res() res: Response) {
    return res.redirect('/admin/dashboard');
  }

  @Get('dashboard')
  getDashboardPage(@Res() res: Response) {
    res.sendFile(
      join(process.cwd(), 'apps/core/src/assets/admin', 'admin-dashboard.html'),
    );
  }

  @Get('user-management')
  getUserManagementPage(@Res() res: Response) {
    res.sendFile(
      join(
        process.cwd(),
        'apps/core/src/assets/admin',
        'admin-user-management.html',
      ),
    );
  }

  @Get('analytics')
  getAnalyticsPage(@Res() res: Response) {
    res.sendFile(
      join(process.cwd(), 'apps/core/src/assets/admin', 'admin-analytics.html'),
    );
  }

  @Get('content-management')
  getContentManagementPage(@Res() res: Response) {
    res.sendFile(
      join(
        process.cwd(),
        'apps/core/src/assets/admin',
        'admin-content-management.html',
      ),
    );
  }

  @Get('notifications')
  getNotificationsPage(@Res() res: Response) {
    res.sendFile(
      join(
        process.cwd(),
        'apps/core/src/assets/admin',
        'admin-notifications.html',
      ),
    );
  }

  @Get('security')
  getSecurityPage(@Res() res: Response) {
    res.sendFile(
      join(process.cwd(), 'apps/core/src/assets/admin', 'admin-security.html'),
    );
  }

  @Get('system-settings')
  getSystemSettingsPage(@Res() res: Response) {
    res.sendFile(
      join(
        process.cwd(),
        'apps/core/src/assets/admin',
        'admin-system-settings.html',
      ),
    );
  }
}
