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
  @ApiOperation({ summary: '관리자 대시보드 요약 통계 조회' })
  async getSummary() {
    return this.adminDashboardApiService.getSummary();
  }
}
