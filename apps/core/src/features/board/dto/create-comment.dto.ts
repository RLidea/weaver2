import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Post ID' })
  @IsString()
  @IsNotEmpty()
  postId: string;

  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: '답글 대상 댓글 ID (대댓글 작성 시)' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
