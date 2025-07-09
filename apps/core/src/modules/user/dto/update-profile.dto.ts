import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '표시 이름' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  displayName?: string;

  @ApiPropertyOptional({ description: '사용자 이름 (로그인 ID)' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  username?: string;
}
