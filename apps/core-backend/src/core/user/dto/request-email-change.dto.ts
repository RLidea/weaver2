import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NormalizeEmail } from '../../auth/utils/email.util';

export class RequestEmailChangeDto {
  @ApiProperty({ example: 'currentPassword123' })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty({ example: 'newemail@example.com' })
  @IsEmail()
  @NormalizeEmail()
  newEmail: string;
}
