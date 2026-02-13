import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../../features/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AdminSecurityApiService } from '../services/admin-security.api.service';

@ApiTags('Admin Security')
@Controller({ path: 'admin/security', version: '1' })
@RequirePermission(PERMISSIONS.ADMIN.SECURITY)
export class AdminSecurityApiController {
  constructor(private readonly adminSecurityService: AdminSecurityApiService) {}

  @Get('system-status')
  @ApiOperation({ summary: 'Get system security status' })
  async getSystemStatus() {
    return this.adminSecurityService.getSystemStatus();
  }

  @Get('security-overview')
  @ApiOperation({ summary: 'Get security overview with key metrics' })
  async getSecurityOverview() {
    return this.adminSecurityService.getSecurityOverview();
  }

  @Post('run-scan')
  @ApiOperation({ summary: 'Run a security scan' })
  async runSecurityScan() {
    return this.adminSecurityService.runSecurityScan();
  }

  @Get('audit-history')
  @ApiOperation({ summary: 'Get audit history with pagination' })
  async getAuditHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.adminSecurityService.getAuditHistory(limitNum, offsetNum);
  }

  @Get('audit-report/:id')
  @ApiOperation({ summary: 'Get specific audit report by ID' })
  async getAuditReportById(@Param('id') id: string) {
    return this.adminSecurityService.getAuditReportById(id);
  }
}
