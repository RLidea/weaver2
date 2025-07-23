import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ description: 'Board ID' })
  @IsString()
  @IsNotEmpty()
  boardId: string;

  @ApiProperty({ description: 'Post title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Post content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
