import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class CreatePermissionGroupDto {
  @ApiProperty({ description: '그룹 이름', example: 'Editor' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    description: '그룹 설명',
    example: '콘텐츠 편집 권한을 가진 그룹',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;
}

export class UpdatePermissionGroupDto {
  @ApiPropertyOptional({ description: '그룹 이름', example: 'Editor' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    description: '그룹 설명',
    example: '콘텐츠 편집 권한을 가진 그룹',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;
}
