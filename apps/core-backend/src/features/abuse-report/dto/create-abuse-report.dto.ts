import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { AbuseReportTarget, AbuseReportReason } from '@prisma/client';

export class CreateAbuseReportDto {
  @ApiProperty({ enum: AbuseReportTarget, description: '신고 대상 타입' })
  @IsEnum(AbuseReportTarget)
  targetType: AbuseReportTarget;

  @ApiProperty({ description: '신고 대상 ID' })
  @IsUUID()
  targetId: string;

  @ApiProperty({ enum: AbuseReportReason, description: '신고 사유' })
  @IsEnum(AbuseReportReason)
  reason: AbuseReportReason;

  @ApiPropertyOptional({ description: '상세 설명 (최대 500자)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
