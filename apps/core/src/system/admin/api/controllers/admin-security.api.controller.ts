import { Controller, Get, Post, UseGuards, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../features/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../features/auth/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AdminSecurityApiService } from '../services/admin-security.api.service';

@Controller('api/admin/security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DEVELOPER)
export class AdminSecurityApiController {
  constructor(private readonly adminSecurityService: AdminSecurityApiService) {}

  @Get('system-status')
  async getSystemStatus() {
    return await this.adminSecurityService.getSystemStatus();
  }

  @Get('security-overview')
  async getSecurityOverview() {
    return await this.adminSecurityService.getSecurityOverview();
  }

  @Post('run-scan')
  async runSecurityScan() {
    return await this.adminSecurityService.runSecurityScan();
  }

  @Get('audit-history')
  async getAuditHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return await this.adminSecurityService.getAuditHistory(limitNum, offsetNum);
  }

  @Get('audit-report/:id')
  async getAuditReportById(@Param('id') id: string) {
    return await this.adminSecurityService.getAuditReportById(id);
  }
}
