import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AbuseReportAction } from '@prisma/client';

export class ResolveAbuseReportDto {
  @ApiProperty({ enum: AbuseReportAction, description: '취한 조치' })
  @IsEnum(AbuseReportAction)
  actionTaken: AbuseReportAction;

  @ApiPropertyOptional({ description: '처리 메모' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  moderatorNote?: string;
}
