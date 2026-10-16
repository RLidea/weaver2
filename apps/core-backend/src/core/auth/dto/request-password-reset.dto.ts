import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NormalizeEmail } from '../utils/email.util';

export class RequestPasswordResetDto {
  @IsEmail()
  @NormalizeEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The email address of the user to reset the password for.',
    example: 'user@example.com',
  })
  email: string;
}
