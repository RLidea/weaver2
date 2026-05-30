import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { AbuseReportStatus, AbuseReportTarget } from '@prisma/client';

export class AbuseReportsQueryDto {
  @ApiPropertyOptional({ enum: AbuseReportStatus })
  @IsOptional()
  @IsEnum(AbuseReportStatus)
  status?: AbuseReportStatus;

  @ApiPropertyOptional({ enum: AbuseReportTarget })
  @IsOptional()
  @IsEnum(AbuseReportTarget)
  targetType?: AbuseReportTarget;

  @ApiPropertyOptional()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  limit?: number;
}
