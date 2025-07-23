import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
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
    description: 'Page number',
    default: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    default: 10,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  limit?: number = 10;
}
