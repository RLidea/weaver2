import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommentDto {
  @ApiProperty({ description: 'Comment ID' })
  id: string;

  @ApiProperty({ description: 'Comment content' })
  content: string;

  @ApiProperty({ description: '삭제 여부' })
  isDeleted: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Post ID' })
  postId: string;

  @ApiProperty({ description: 'Author ID' })
  authorId: string;

  @ApiPropertyOptional({ description: '부모 댓글 ID (대댓글인 경우)' })
  parentId?: string | null;

  @ApiProperty({ description: 'Author information' })
  author?: {
    id: string;
    username: string;
    displayName: string;
  };

  @ApiPropertyOptional({ description: '답글 목록', type: () => [CommentDto] })
  children?: CommentDto[];

  @ApiProperty({ description: 'Post information (for search results)' })
  post?: {
    id: string;
    title: string;
    boardId: string;
  };
}
