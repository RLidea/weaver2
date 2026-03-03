import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ResourcePermissionRuleDto {
  @ApiProperty({ description: '액션', example: 'read' })
  @IsString()
  action: string;

  @ApiPropertyOptional({
    description: '비로그인 접근 허용 여부',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  allowAnonymous?: boolean;

  @ApiPropertyOptional({
    description: '허용 그룹 ID 배열 (빈 배열 = 로그인만 하면 허용)',
    example: [],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedGroupIds?: string[];

  @ApiPropertyOptional({
    description: '거부 그룹 ID 배열',
    example: [],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  deniedGroupIds?: string[];
}

export class SetResourcePermissionsDto {
  @ApiProperty({
    description: '리소스 권한 규칙 배열 (해당 리소스의 모든 규칙을 교체)',
    type: [ResourcePermissionRuleDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourcePermissionRuleDto)
  rules: ResourcePermissionRuleDto[];
}
