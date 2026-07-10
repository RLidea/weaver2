import { ApiProperty } from '@nestjs/swagger';
import { KeysetResponseDto } from '@weaver2/pagination';
import { PostDto } from './post.dto';

export class BoardPostsResponseDto extends KeysetResponseDto<PostDto> {
  // 부모(KeysetResponseDto)의 data는 제네릭이라 @ApiHideProperty() 처리되어 있다.
  // 이 클래스는 요소 타입이 PostDto로 확정되므로 여기서 다시 노출한다.
  @ApiProperty({ description: '게시글 목록', type: [PostDto] })
  declare data: PostDto[];

  @ApiProperty({
    description: '고정 게시글 목록 (항상 최상단 표시)',
    type: [PostDto],
  })
  pinnedPosts: PostDto[];
}
