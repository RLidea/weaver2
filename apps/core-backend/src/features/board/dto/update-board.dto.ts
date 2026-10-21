import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateBoardDto {
  @ApiPropertyOptional({ description: 'Board name (must be unique)' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Board description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '켜면 글을 만들고 고칠 때마다 판을 남긴다',
  })
  @IsBoolean()
  @IsOptional()
  keepRevisions?: boolean;
}
