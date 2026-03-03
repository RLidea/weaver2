import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReportTarget,
  ReportReason,
  ReportStatus,
  ReportAction,
} from '@prisma/client';

export class ReportDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reporterId: string;

  @ApiProperty({ enum: ReportTarget })
  targetType: ReportTarget;

  @ApiProperty()
  targetId: string;

  @ApiProperty({ enum: ReportReason })
  reason: ReportReason;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus;

  @ApiPropertyOptional()
  resolvedById: string | null;

  @ApiPropertyOptional()
  resolvedAt: Date | null;

  @ApiPropertyOptional({ enum: ReportAction })
  actionTaken: ReportAction | null;

  @ApiPropertyOptional()
  moderatorNote: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
