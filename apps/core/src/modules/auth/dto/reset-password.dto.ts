import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The password reset token received via email.',
    example: 'a1b2c3d4e5f6g7h8',
  })
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({
    description:
      'The new password for the user. Must be at least 8 characters long.',
    example: 'newSecurePassword123',
  })
  password: string;
}
