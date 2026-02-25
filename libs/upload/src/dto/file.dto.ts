import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FileDto {
  @ApiProperty({ description: '파일 ID' })
  id: string;

  @ApiProperty({ description: '원본 파일명' })
  originalName: string;

  @ApiProperty({ description: '저장된 파일명 (UUID 기반)' })
  storedName: string;

  @ApiProperty({ description: 'MIME 타입' })
  mimeType: string;

  @ApiProperty({ description: '파일 크기 (bytes)' })
  size: number;

  @ApiProperty({ description: '파일 경로' })
  path: string;

  @ApiPropertyOptional({ description: '썸네일 경로 (이미지만)' })
  thumbnailPath: string | null;

  @ApiPropertyOptional({ description: '연결된 게시글 ID' })
  postId: string | null;

  @ApiPropertyOptional({ description: '업로드한 사용자 ID' })
  uploadedById: string | null;

  @ApiProperty({ description: '생성 시각' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '소프트 삭제 시각' })
  deletedAt: Date | null;
}
