import { ApiProperty } from '@nestjs/swagger';

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
}
