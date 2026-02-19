import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/constants';
import { KEYSET_PRESET_NAMES } from '../keyset.presets';

export class KeysetRequestDto {
  @ApiPropertyOptional({ description: '다음 페이지 커서 (불투명 문자열)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: '페이지당 아이템 수',
    default: DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description: `정렬 preset (${KEYSET_PRESET_NAMES.join(' | ')})`,
    default: 'created-at',
    enum: KEYSET_PRESET_NAMES,
  })
  @IsOptional()
  @IsString()
  @IsIn(KEYSET_PRESET_NAMES)
  preset?: string = 'created-at';
}
