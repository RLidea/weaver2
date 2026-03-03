import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The email address of the user to reset the password for.',
    example: 'user@example.com',
  })
  email: string;
}
