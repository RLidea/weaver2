import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserDto {
  @ApiProperty({
    type: String,
    description: 'Unique user ID',
    example: 'clxgy8o6p00001234567890ab',
  })
  id: string;

  @ApiProperty({
    type: String,
    description: 'Username',
    example: 'testuser',
  })
  username: string;

  @ApiProperty({
    type: String,
    description: 'Display name',
    example: 'Test User',
  })
  displayName: string;

  @ApiProperty({
    enum: Role,
    description: 'User role',
    example: Role.USER,
  })
  role: Role;
}
