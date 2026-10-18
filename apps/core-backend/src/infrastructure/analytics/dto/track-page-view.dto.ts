import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// 누가 · 어디서 · 무엇으로 왔는지(userId · IP · User-Agent)는 본문으로 받지 않는다 — 공개 끝점이라
// 받으면 누구나 남의 userId 로 기록을 남긴다. 서버가 세션과 요청에서 읽는다.
export class TrackPageViewDto {
  @ApiProperty({
    description: '방문한 페이지의 URL 경로',
    example: '/products/123',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  pageUrl: string;

  @ApiPropertyOptional({
    description: '유입 경로 (이전 페이지 URL). 비우면 Referer 헤더를 쓴다',
    example: 'https://google.com/search?q=example',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  referrer?: string;
}

export class TrackBulkPageViewsDto {
  @ApiProperty({
    type: [TrackPageViewDto],
    description: '트래킹할 페이지뷰 목록 (최대 100개)',
    maxItems: 100,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TrackPageViewDto)
  pageViews: TrackPageViewDto[];
}

export class TrackBulkPageViewsResponseDto {
  @ApiProperty({ description: '기록한 개수', example: 3 })
  processed: number;

  @ApiProperty({ description: '기록하지 못한 개수', example: 0 })
  failed: number;
}
