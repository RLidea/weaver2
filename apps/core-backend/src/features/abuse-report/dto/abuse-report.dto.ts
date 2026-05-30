import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AbuseReportTarget,
  AbuseReportReason,
  AbuseReportStatus,
  AbuseReportAction,
} from '@prisma/client';

export class AbuseReportDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reporterId: string;

  @ApiProperty({ enum: AbuseReportTarget })
  targetType: AbuseReportTarget;

  @ApiProperty()
  targetId: string;

  @ApiProperty({ enum: AbuseReportReason })
  reason: AbuseReportReason;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({ enum: AbuseReportStatus })
  status: AbuseReportStatus;

  @ApiPropertyOptional()
  resolvedById: string | null;

  @ApiPropertyOptional()
  resolvedAt: Date | null;

  @ApiPropertyOptional({ enum: AbuseReportAction })
  actionTaken: AbuseReportAction | null;

  @ApiPropertyOptional()
  moderatorNote: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
