import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class EmailLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
