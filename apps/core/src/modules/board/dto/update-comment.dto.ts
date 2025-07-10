import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateCommentDto {
  @ApiPropertyOptional({ description: '댓글 내용' })
  @IsOptional()
  @IsString()
  content?: string;
}
