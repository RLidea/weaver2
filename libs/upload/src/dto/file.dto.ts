import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FileDto {
  @ApiProperty({ description: '파일 ID' })
  id: string;

  @ApiProperty({ description: '원본 파일명' })
  originalName: string;

  @ApiProperty({ description: 'MIME 타입' })
  mimeType: string;

  @ApiProperty({ description: '파일 크기 (bytes)' })
  size: number;

  @ApiProperty({
    description:
      '파일 주소 `${FILE_URL_BASE}/v1/files/:id` — 받을 때마다 권한을 본다(로컬은 스트림, S3 는 60초 서명 URL 로 302)',
  })
  url: string;

  @ApiPropertyOptional({ description: '썸네일 주소 (이미지만)' })
  thumbnailUrl: string | null;

  @ApiPropertyOptional({ description: '업로드한 사용자 ID' })
  uploadedById: string | null;

  @ApiProperty({ description: '생성 시각' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '소프트 삭제 시각' })
  deletedAt: Date | null;
}
