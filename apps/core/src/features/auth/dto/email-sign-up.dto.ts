import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsEmail,
  IsNotEmpty,
  IsArray,
} from 'class-validator';

export class EmailSignUpDto {
  @ApiProperty({ description: 'Username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'List of agreed term IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  agreedTermsIds: string[];
}
