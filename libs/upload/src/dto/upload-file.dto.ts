import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @ApiPropertyOptional({ description: '연결할 게시글 ID (선택)' })
  @IsOptional()
  @IsString()
  postId?: string;

  @ApiPropertyOptional({
    description: '썸네일 생성 여부 (기본: true, 이미지 파일에만 적용)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value !== 'false' && value !== false)
  generateThumbnail?: boolean;
}
