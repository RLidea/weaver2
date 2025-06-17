import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PaginationRequestDto {
  @ApiPropertyOptional({
    description: '페이지 번호 (1부터 시작)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '페이지당 아이템 수',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '정렬 조건 (예: createdAt:desc)',
    example: 'createdAt:desc',
  })
  @IsOptional()
  @IsString()
  sort?: string; // e.g., "createdAt:desc,name:asc"

  @ApiPropertyOptional({
    description: '필터 조건 (예: role:ADMIN,username:admin)',
  })
  @IsOptional()
  @IsString()
  filter?: string; // JSON string or key:value,key2:value2
}
