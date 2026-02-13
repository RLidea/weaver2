import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../../features/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AdminDashboardApiService } from '../services/admin-dashboard.api.service';

@ApiTags('Admin Dashboard')
@Controller({ path: 'admin/dashboard', version: '1' })
@RequirePermission(PERMISSIONS.ADMIN.DASHBOARD)
export class AdminDashboardApiController {
  constructor(
    private readonly adminDashboardApiService: AdminDashboardApiService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get admin dashboard summary statistics' })
  async getSummary() {
    return this.adminDashboardApiService.getSummary();
  }
}
