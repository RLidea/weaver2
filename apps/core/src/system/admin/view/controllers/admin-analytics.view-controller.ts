import { Controller, Get, Render } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@Roles(Role.ADMIN)
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
