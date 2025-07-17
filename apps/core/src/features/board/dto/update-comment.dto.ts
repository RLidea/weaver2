import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateCommentDto {
  @ApiPropertyOptional({ description: 'Comment content' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string;
}
