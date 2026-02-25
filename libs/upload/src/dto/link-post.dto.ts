import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LinkPostDto {
  @ApiProperty({ description: '연결할 게시글 ID' })
  @IsString()
  @IsNotEmpty()
  postId: string;
}
