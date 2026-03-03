import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ description: '표시 이름' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @ApiPropertyOptional({ description: '사용자명' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  username?: string;

  @ApiPropertyOptional({ description: '이메일' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
