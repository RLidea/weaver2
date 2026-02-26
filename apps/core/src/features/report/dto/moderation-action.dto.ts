import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class HideContentDto {
  @ApiPropertyOptional({ description: '숨김 사유' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class WarnUserDto {
  @ApiPropertyOptional({ description: '경고 사유' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class SuspendUserDto {
  @ApiPropertyOptional({ description: '정지 사유' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;

  @ApiPropertyOptional({ description: '정지 기간 (일). 미입력 시 영구 정지' })
  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number;
}
