import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RequirePermission } from '../../../core/permission/decorators/require-permission.decorator';
import { PermissionGuard } from '../../../core/permission/guards/permission.guard';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { AuthUser, CommonAuthUserDto } from '@weaver2/common';
import { ApiStandardResponses } from '@weaver2/common/decorator/swagger/api-standard-responses.decorator';
import { ReportService } from '../services/report.service';
import { CreateReportDto } from '../dto/create-report.dto';
import { ReportDto } from '../dto/report.dto';

@ApiTags('Report')
@Controller({ path: 'reports', version: '1' })
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @RequirePermission(PERMISSIONS.REPORT.CREATE)
  @ApiOperation({ summary: '신고 접수' })
  @ApiStandardResponses({ type: ReportDto })
  async createReport(
    @Body() dto: CreateReportDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<ReportDto> {
    return this.reportService.createReport(authUser.id, dto);
  }
}
