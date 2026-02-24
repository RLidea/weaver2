import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty({ description: '카테고리 ID' })
  id: string;

  @ApiProperty({ description: '카테고리 이름' })
  name: string;

  @ApiPropertyOptional({ description: '카테고리 설명' })
  description: string | null;

  @ApiPropertyOptional({ description: '카테고리 색상 (hex 코드 등)' })
  color: string | null;

  @ApiProperty({ description: '정렬 순서', default: 0 })
  sortOrder: number;

  @ApiProperty({ description: '활성 여부', default: true })
  isActive: boolean;

  @ApiProperty({ description: '게시판 ID' })
  boardId: string;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}
