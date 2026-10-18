import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/** 분석 기간. 비우면 최근 30일, 한쪽만 주면 나머지는 서비스가 채운다 (최대 366일) */
export class AdminAnalyticsRangeQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
