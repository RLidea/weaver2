import { IsBoolean, IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BoardPermissionDto {
  @ApiProperty({ description: 'Action type', example: 'READ' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Allow anonymous users', example: false })
  @IsBoolean()
  @IsOptional()
  allowAnonymous?: boolean;

  @ApiProperty({
    description: 'Allowed roles',
    type: [String],
    example: ['USER', 'MODERATOR'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedRoles?: string[];

  @ApiProperty({ description: 'Allowed user IDs', type: [String], example: [] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedUserIds?: string[];
}

export class UpdateBoardPermissionsDto {
  @ApiProperty({
    description: 'Array of board permissions',
    type: [BoardPermissionDto],
  })
  @IsArray()
  permissions: BoardPermissionDto[];
}
