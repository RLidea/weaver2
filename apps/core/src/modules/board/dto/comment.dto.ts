import { ApiProperty } from '@nestjs/swagger';

export class CommentDto {
  @ApiProperty({ description: '댓글 ID' })
  id: string;

  @ApiProperty({ description: '댓글 내용' })
  content: string;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;

  @ApiProperty({ description: '게시글 ID' })
  postId: string;

  @ApiProperty({ description: '작성자 ID' })
  authorId: string;

  @ApiProperty({ description: '작성자 정보' })
  author?: {
    id: string;
    username: string;
    displayName: string;
  };
}
