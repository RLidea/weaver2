import { IsEmail, IsString, MinLength } from 'class-validator';

export class EmailSignUpDto {
  @IsString()
  username: string;

  @IsString()
  displayName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
