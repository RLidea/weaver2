import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdatePostDto {
  @ApiPropertyOptional({ description: '게시글 제목' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: '게시글 내용' })
  @IsOptional()
  @IsString()
  content?: string;
}
