import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ description: '게시글 제목' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: '게시글 내용' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
