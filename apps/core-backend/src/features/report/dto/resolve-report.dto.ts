import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportAction } from '@prisma/client';

export class ResolveReportDto {
  @ApiProperty({ enum: ReportAction, description: '취한 조치' })
  @IsEnum(ReportAction)
  actionTaken: ReportAction;

  @ApiPropertyOptional({ description: '처리 메모' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  moderatorNote?: string;
}
