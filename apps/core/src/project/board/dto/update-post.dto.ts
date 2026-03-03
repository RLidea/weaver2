import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PostStatus } from '@prisma/client';

export class UpdatePostDto {
  @ApiPropertyOptional({ description: 'Post title' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ description: 'Post content' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @ApiPropertyOptional({ description: '게시글 상태', enum: PostStatus })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({ description: '고정 여부' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: '비밀글 여부' })
  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;

  @ApiPropertyOptional({ description: '우선순위' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({
    description: '카테고리 ID (null 전송 시 카테고리 해제)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  categoryId?: string | null;
}
