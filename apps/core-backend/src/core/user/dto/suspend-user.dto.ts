import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SuspendUserDto {
  @ApiPropertyOptional({
    description: '정지 기간 (일). 생략 시 영구 정지.',
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;

  @ApiPropertyOptional({ description: '정지 사유' })
  @IsOptional()
  @IsString()
  reason?: string;
}
