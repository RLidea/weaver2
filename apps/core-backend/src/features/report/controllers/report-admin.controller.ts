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
import { ReportService } from '../services/report.service';
import { ReportDto } from '../dto/report.dto';
import { ReportsQueryDto } from '../dto/reports-query.dto';
import { ResolveReportDto } from '../dto/resolve-report.dto';

@ApiTags('Report Admin')
@Controller({ path: 'admin/reports', version: '1' })
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReportAdminController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  @RequirePermission(PERMISSIONS.REPORT.READ)
  @ApiOperation({ summary: '신고 목록 조회' })
  @ApiStandardResponses({ type: ReportDto, isArray: true })
  async findReports(@Query() query: ReportsQueryDto) {
    return this.reportService.findReports(query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.REPORT.READ)
  @ApiOperation({ summary: '신고 상세 조회' })
  @ApiStandardResponses({ type: ReportDto })
  async findReport(@Param('id') id: string): Promise<ReportDto> {
    return this.reportService.findReportById(id);
  }

  @Patch(':id/review')
  @RequirePermission(PERMISSIONS.REPORT.UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '신고 검토 시작' })
  @ApiStandardResponses({ type: ReportDto })
  async startReview(
    @Param('id') id: string,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<ReportDto> {
    return this.reportService.startReview(id, authUser.id);
  }

  @Patch(':id/resolve')
  @RequirePermission(PERMISSIONS.REPORT.UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '신고 처리 완료' })
  @ApiStandardResponses({ type: ReportDto })
  async resolveReport(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<ReportDto> {
    return this.reportService.resolveReport(id, authUser.id, dto);
  }

  @Patch(':id/dismiss')
  @RequirePermission(PERMISSIONS.REPORT.UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '신고 기각' })
  @ApiStandardResponses({ type: ReportDto })
  async dismissReport(
    @Param('id') id: string,
    @Body() body: { moderatorNote?: string },
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<ReportDto> {
    return this.reportService.dismissReport(
      id,
      authUser.id,
      body.moderatorNote,
    );
  }
}
