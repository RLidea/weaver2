import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @ApiPropertyOptional({ description: '연결할 게시글 ID (선택)' })
  @IsOptional()
  @IsString()
  postId?: string;
}
