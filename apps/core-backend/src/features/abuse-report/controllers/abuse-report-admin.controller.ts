import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RequirePermission } from '../../../core/permission/decorators/require-permission.decorator';
import { PermissionGuard } from '../../../core/permission/guards/permission.guard';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { AbuseReportService } from '../services/abuse-report.service';
import { AbuseReportDto } from '../dto/abuse-report.dto';
import { AbuseReportsQueryDto } from '../dto/abuse-reports-query.dto';
import { ResolveAbuseReportDto } from '../dto/resolve-abuse-report.dto';

@ApiTags('Abuse Report Admin')
@Controller({ path: 'admin/abuse-reports', version: '1' })
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AbuseReportAdminController {
  constructor(private readonly abuseReportService: AbuseReportService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ABUSE_REPORT.READ)
  @ApiOperation({ summary: '신고 목록 조회' })
  @ApiStandardResponses({ type: AbuseReportDto, isArray: true })
  async findReports(@Query() query: AbuseReportsQueryDto) {
    return this.abuseReportService.findReports(query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.ABUSE_REPORT.READ)
  @ApiOperation({ summary: '신고 상세 조회' })
  @ApiStandardResponses({ type: AbuseReportDto })
  async findReport(@Param('id') id: string): Promise<AbuseReportDto> {
    return this.abuseReportService.findReportById(id);
  }

  @Patch(':id/review')
  @RequirePermission(PERMISSIONS.ABUSE_REPORT.UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '신고 검토 시작' })
  @ApiStandardResponses({ type: AbuseReportDto })
  async startReview(
    @Param('id') id: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<AbuseReportDto> {
    return this.abuseReportService.startReview(id, authUser.id);
  }

  @Patch(':id/resolve')
  @RequirePermission(PERMISSIONS.ABUSE_REPORT.UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '신고 처리 완료' })
  @ApiStandardResponses({ type: AbuseReportDto })
  async resolveReport(
    @Param('id') id: string,
    @Body() dto: ResolveAbuseReportDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<AbuseReportDto> {
    return this.abuseReportService.resolveReport(id, authUser.id, dto);
  }

  @Patch(':id/dismiss')
  @RequirePermission(PERMISSIONS.ABUSE_REPORT.UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '신고 기각' })
  @ApiStandardResponses({ type: AbuseReportDto })
  async dismissReport(
    @Param('id') id: string,
    @Body() body: { moderatorNote?: string },
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<AbuseReportDto> {
    return this.abuseReportService.dismissReport(
      id,
      authUser.id,
      body.moderatorNote,
    );
  }
}
