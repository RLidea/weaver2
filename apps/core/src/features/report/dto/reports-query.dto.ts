import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ReportStatus, ReportTarget } from '@prisma/client';

export class ReportsQueryDto {
  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ enum: ReportTarget })
  @IsOptional()
  @IsEnum(ReportTarget)
  targetType?: ReportTarget;

  @ApiPropertyOptional()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  limit?: number;
}
