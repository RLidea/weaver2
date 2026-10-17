import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/** 업로드는 붙을 곳 없이 한다 — 붙이기는 붙는 쪽(글 저장·프로필 지정)이 판정한다 */
export class UploadFileDto {
  @ApiPropertyOptional({
    description: '썸네일 생성 여부 (기본: true, 이미지 파일에만 적용)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value !== 'false' && value !== false)
  generateThumbnail?: boolean;
}
