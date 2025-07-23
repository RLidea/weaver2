import { ApiProperty } from '@nestjs/swagger';

export class CommentDto {
  @ApiProperty({ description: 'Comment ID' })
  id: string;

  @ApiProperty({ description: 'Comment content' })
  content: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Post ID' })
  postId: string;

  @ApiProperty({ description: 'Author ID' })
  authorId: string;

  @ApiProperty({ description: 'Author information' })
  author?: {
    id: string;
    username: string;
    displayName: string;
  };

  @ApiProperty({ description: 'Post information (for search results)' })
  post?: {
    id: string;
    title: string;
    boardId: string;
  };
}
