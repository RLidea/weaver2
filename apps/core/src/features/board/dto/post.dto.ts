import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

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
