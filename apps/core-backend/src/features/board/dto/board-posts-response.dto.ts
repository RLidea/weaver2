import { ApiProperty } from '@nestjs/swagger';
import { KeysetResponseDto } from '@weaver2/pagination';
import { PostDto } from './post.dto';

export class BoardPostsResponseDto extends KeysetResponseDto<PostDto> {
  @ApiProperty({
    description: '고정 게시글 목록 (항상 최상단 표시)',
    type: [PostDto],
  })
  pinnedPosts: PostDto[];
}
