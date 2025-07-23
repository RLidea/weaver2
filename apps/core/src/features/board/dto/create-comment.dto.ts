import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Post ID' })
  @IsString()
  @IsNotEmpty()
  postId: string;

  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
