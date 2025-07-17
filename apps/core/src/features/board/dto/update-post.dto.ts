import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdatePostDto {
  @ApiPropertyOptional({ description: 'Post title' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Post content' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string;
}
