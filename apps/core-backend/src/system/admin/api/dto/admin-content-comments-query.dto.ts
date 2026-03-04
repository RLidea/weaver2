import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { OffsetRequestDto } from '@weaver2/pagination';

export class AdminContentCommentsQueryDto extends OffsetRequestDto {
  @ApiPropertyOptional({ description: '게시글 ID 필터' })
  @IsOptional()
  @IsString()
  postId?: string;

  @ApiPropertyOptional({ description: '내용 검색' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '소프트 삭제된 댓글 포함 여부 (기본값: false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  includeDeleted?: boolean;
}
