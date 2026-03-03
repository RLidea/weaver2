import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';
import { BoardDto } from './board.dto';

export class PostDto {
  @ApiProperty({ description: 'Post ID' })
  id: string;

  @ApiProperty({ description: 'Post title' })
  title: string;

  @ApiProperty({ description: 'Post content' })
  content: string;

  @ApiProperty({ description: 'View count' })
  viewCount: number;

  @ApiProperty({ description: '게시글 상태', enum: PostStatus })
  status: PostStatus;

  @ApiProperty({ description: '고정 여부' })
  isPinned: boolean;

  @ApiProperty({ description: '비밀글 여부' })
  isSecret: boolean;

  @ApiProperty({ description: '우선순위' })
  priority: number;

  @ApiPropertyOptional({ description: '카테고리 ID' })
  categoryId: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: '소프트 삭제 시각 (null이면 삭제되지 않음)',
  })
  deletedAt: Date | null;

  @ApiProperty({ description: 'Board ID' })
  boardId: string;

  @ApiProperty({ description: 'Author ID' })
  authorId: string;

  @ApiProperty({ description: 'Board information' })
  board: BoardDto;

  @ApiProperty({ description: 'Author information' })
  author?: {
    id: string;
    username: string;
    displayName: string;
  };
}
