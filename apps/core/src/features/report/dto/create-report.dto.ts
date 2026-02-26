import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ReportTarget, ReportReason } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({ enum: ReportTarget, description: '신고 대상 타입' })
  @IsEnum(ReportTarget)
  targetType: ReportTarget;

  @ApiProperty({ description: '신고 대상 ID' })
  @IsUUID()
  targetId: string;

  @ApiProperty({ enum: ReportReason, description: '신고 사유' })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({ description: '상세 설명 (최대 500자)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
