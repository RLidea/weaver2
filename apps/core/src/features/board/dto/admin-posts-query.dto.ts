import { ApiPropertyOptional } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { KeysetRequestDto } from '@weaver2/pagination';

export class AdminPostsQueryDto extends KeysetRequestDto {
  @ApiPropertyOptional({ description: '게시판 ID 필터' })
  @IsOptional()
  @IsString()
  boardId?: string;

  @ApiPropertyOptional({ description: '작성자 ID 필터' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ description: '게시글 상태 필터', enum: PostStatus })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({
    description: '소프트 삭제된 게시글 포함 여부 (기본값: false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  includeDeleted?: boolean;
}
