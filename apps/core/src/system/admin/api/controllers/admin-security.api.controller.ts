import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { RequirePermission } from '../../../../features/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AdminSecurityApiService } from '../services/admin-security.api.service';

@Controller('api/admin/security')
@RequirePermission(PERMISSIONS.ADMIN.SECURITY)
export class AdminSecurityApiController {
  constructor(private readonly adminSecurityService: AdminSecurityApiService) {}

  @Get('system-status')
  async getSystemStatus() {
    return this.adminSecurityService.getSystemStatus();
  }

  @Get('security-overview')
  async getSecurityOverview() {
    return this.adminSecurityService.getSecurityOverview();
  }

  @Post('run-scan')
  async runSecurityScan() {
    return this.adminSecurityService.runSecurityScan();
  }

  @Get('audit-history')
  async getAuditHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.adminSecurityService.getAuditHistory(limitNum, offsetNum);
  }

  @Get('audit-report/:id')
  async getAuditReportById(@Param('id') id: string) {
    return this.adminSecurityService.getAuditReportById(id);
  }
}
