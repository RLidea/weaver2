import { ApiProperty } from '@nestjs/swagger';
import { PostDto } from '../../board/dto/post.dto';
import { CommentDto } from '../../board/dto/comment.dto';

export class SearchResultDto {
  @ApiProperty({
    description: 'Found posts',
    type: [PostDto],
  })
  posts: PostDto[];

  @ApiProperty({
    description: 'Found comments',
    type: [CommentDto],
  })
  comments: CommentDto[];

  @ApiProperty({
    description: 'Total counts for each type',
    example: { posts: 15, comments: 8 },
  })
  total: {
    posts: number;
    comments: number;
  };
}

export class SearchResponseDto {
  @ApiProperty({ type: SearchResultDto })
  data: SearchResultDto;

  @ApiProperty({
    description: 'Query that was searched',
    example: 'hello world',
  })
  query: string;

  @ApiProperty({ description: 'Total number of results found', example: 23 })
  totalCount: number;
}
