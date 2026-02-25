import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { KeysetRequestDto } from '@weaver2/pagination';

export class AdminFilesQueryDto extends KeysetRequestDto {
  @ApiPropertyOptional({ description: '업로더 ID 필터' })
  @IsOptional()
  @IsString()
  uploadedById?: string;

  @ApiPropertyOptional({ description: '게시글 ID 필터' })
  @IsOptional()
  @IsString()
  postId?: string;

  @ApiPropertyOptional({
    description: '소프트 삭제된 파일 포함 여부 (기본값: false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  includeDeleted?: boolean;
}
