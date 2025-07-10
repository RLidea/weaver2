import { ApiProperty } from '@nestjs/swagger';
import { BoardDto } from './board.dto';

export class PostDto {
  @ApiProperty({ description: '게시글 ID' })
  id: string;

  @ApiProperty({ description: '게시글 제목' })
  title: string;

  @ApiProperty({ description: '게시글 내용' })
  content: string;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;

  @ApiProperty({ description: '게시판 ID' })
  boardId: string;

  @ApiProperty({ description: '작성자 ID' })
  authorId: string;

  @ApiProperty({ description: '게시판 정보' })
  board?: BoardDto;

  @ApiProperty({ description: '작성자 정보' })
  author?: {
    id: string;
    username: string;
    displayName: string;
  };
}
