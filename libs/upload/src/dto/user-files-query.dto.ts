import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { KeysetRequestDto } from '@weaver2/pagination';

export class UserFilesQueryDto extends KeysetRequestDto {
  @ApiPropertyOptional({ description: '게시글 ID 필터' })
  @IsOptional()
  @IsString()
  postId?: string;
}
