import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

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

export class SetGroupPermissionsDto {
  @ApiProperty({
    description: '설정할 권한 문자열 배열 (기존 권한을 전체 교체)',
    example: ['post:create', 'post:read', 'comment:create'],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

export class RemoveGroupPermissionsDto {
  @ApiProperty({
    description: '제거할 권한 문자열 배열',
    example: ['post:create'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  permissions: string[];
}

export class AssignUsersToGroupDto {
  @ApiProperty({
    description: '할당할 사용자 ID 배열',
    example: ['user-uuid-1', 'user-uuid-2'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[];
}
