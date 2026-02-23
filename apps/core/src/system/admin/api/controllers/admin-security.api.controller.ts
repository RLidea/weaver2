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
  @ApiOperation({ summary: '시스템 보안 상태 조회' })
  async getSystemStatus() {
    return this.adminSecurityService.getSystemStatus();
  }

  @Get('security-overview')
  @ApiOperation({ summary: '보안 개요 및 핵심 지표 조회' })
  async getSecurityOverview() {
    return this.adminSecurityService.getSecurityOverview();
  }

  @Post('run-scan')
  @ApiOperation({ summary: '보안 스캔 실행' })
  async runSecurityScan() {
    return this.adminSecurityService.runSecurityScan();
  }

  @Get('audit-history')
  @ApiOperation({ summary: '감사 이력 조회 (페이지네이션)' })
  async getAuditHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.adminSecurityService.getAuditHistory(limitNum, offsetNum);
  }

  @Get('audit-report/:id')
  @ApiOperation({ summary: '특정 감사 보고서 조회' })
  async getAuditReportById(@Param('id') id: string) {
    return this.adminSecurityService.getAuditReportById(id);
  }

  @Get('users/:userId/oauth-connections')
  @ApiOperation({ summary: '특정 유저의 소셜 계정 연동 목록 조회' })
  async getUserOAuthConnections(@Param('userId') userId: string) {
    return this.adminSecurityService.getUserOAuthConnections(userId);
  }
}
