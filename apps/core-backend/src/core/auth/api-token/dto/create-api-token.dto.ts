import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export const API_TOKEN_SCOPE_PATTERN = /^[a-z0-9]+([:._-][a-z0-9]+)*$/;

export class CreateApiTokenDto {
  @ApiProperty({ description: '토큰의 주인 (쓰기의 주체가 된다)' })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: '알아보기 위한 이름',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({
    description: '범위 — 파생 프로젝트가 `@ApiTokenScope` 로 연 이름',
    type: [String],
    example: ['blog:draft'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  @Matches(API_TOKEN_SCOPE_PATTERN, { each: true })
  scopes: string[];

  @ApiPropertyOptional({
    description: '만료 시각 (ISO 8601). 없으면 끊을 때까지 산다',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
