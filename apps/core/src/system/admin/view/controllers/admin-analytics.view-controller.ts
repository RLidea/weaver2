import { Controller, Get, Render } from '@nestjs/common';
import { RequirePermission } from '../../../../features/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';

@Controller('admin')
@RequirePermission(PERMISSIONS.ADMIN.ACCESS)
export class AdminAnalyticsViewController {
  @Get('analytics')
  @Render('admin/admin-analytics')
  analytics() {
    return {
      title: 'Analytics - Admin Dashboard',
      pageId: 'admin-analytics',
      currentPage: 'analytics',
    };
  }
}
