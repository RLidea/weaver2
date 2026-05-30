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
import { AbuseReportService } from '../services/abuse-report.service';
import { CreateAbuseReportDto } from '../dto/create-abuse-report.dto';
import { AbuseReportDto } from '../dto/abuse-report.dto';

@ApiTags('Abuse Report')
@Controller({ path: 'abuse-reports', version: '1' })
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AbuseReportController {
  constructor(private readonly abuseReportService: AbuseReportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @RequirePermission(PERMISSIONS.ABUSE_REPORT.CREATE)
  @ApiOperation({ summary: '신고 접수' })
  @ApiStandardResponses({ type: AbuseReportDto })
  async createReport(
    @Body() dto: CreateAbuseReportDto,
    @AuthUser() authUser: CommonAuthUserDto,
  ): Promise<AbuseReportDto> {
    return this.abuseReportService.createReport(authUser.id, dto);
  }
}
