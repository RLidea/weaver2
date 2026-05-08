import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, Max, Min, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export enum SearchType {
  POSTS = 'posts',
  COMMENTS = 'comments',
  ALL = 'all',
}

export class SearchRequestDto {
  @ApiProperty({
    description: 'Search query',
    example: '검색어',
  })
  @IsString()
  q: string;

  @ApiProperty({
    description: 'Search type',
    enum: SearchType,
    default: SearchType.ALL,
    required: false,
  })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @ApiProperty({
    description: 'Board ID to filter results',
    required: false,
  })
  @IsOptional()
  @IsString()
  boardId?: string;

  @ApiProperty({
    description: 'Page number (1-100)',
    default: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  @Min(1, { message: 'page는 1 이상이어야 합니다.' })
  @Max(100, {
    message:
      'page는 100 이하만 지원합니다. 더 깊은 결과는 검색어를 좁혀주세요.',
  })
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page (1-50)',
    default: 10,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  @Min(1, { message: 'limit은 1 이상이어야 합니다.' })
  @Max(50, { message: 'limit은 50 이하여야 합니다.' })
  limit?: number = 10;
}
