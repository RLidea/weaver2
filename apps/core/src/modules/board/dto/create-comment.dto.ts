import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: '댓글 내용' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
