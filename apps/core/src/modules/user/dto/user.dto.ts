import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserDto {
  @ApiProperty({
    example: 'c1a9f5b4-3e2d-4c1a-9f5b-4e2d1a9f5b4e',
    description: '사용자 고유 ID',
  })
  id: string;

  @ApiProperty({
    example: 'testuser',
    description: '사용자 이름',
  })
  username: string;

  @ApiProperty({
    example: 'Test User',
    description: '표시 이름',
  })
  displayName: string;

  @ApiProperty({
    enum: Role,
    example: Role.USER,
    description: '사용자 역할',
  })
  role: Role;
}
