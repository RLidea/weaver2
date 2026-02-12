import { IsBoolean, IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BoardPermissionDto {
  @ApiProperty({
    description:
      'Action type (e.g. read, write, edit_own, edit_all, delete_own, delete_all, comment)',
    example: 'read',
  })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Allow anonymous users', example: false })
  @IsBoolean()
  @IsOptional()
  allowAnonymous?: boolean;

  @ApiProperty({
    description: 'Allowed permission group names',
    type: [String],
    example: ['Moderator', 'Admin'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedGroupNames?: string[];
}

export class UpdateBoardPermissionsDto {
  @ApiProperty({
    description: 'Array of board permissions',
    type: [BoardPermissionDto],
  })
  @IsArray()
  permissions: BoardPermissionDto[];
}
