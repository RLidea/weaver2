import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { KeysetRequestDto } from '@weaver2/pagination';

export class BoardPostsQueryDto extends KeysetRequestDto {
  @ApiPropertyOptional({ description: '카테고리 ID 필터' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
