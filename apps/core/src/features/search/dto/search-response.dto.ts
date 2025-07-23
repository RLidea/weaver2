import { ApiProperty } from '@nestjs/swagger';
import { PostDto } from '../../board/dto/post.dto';
import { CommentDto } from '../../board/dto/comment.dto';
import { PaginationResponseDto } from '@weaver2/pagination/dto/pagination-response.dto';

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

export class SearchResponseDto extends PaginationResponseDto<SearchResultDto> {
  @ApiProperty({ type: SearchResultDto })
  data: SearchResultDto;
}
