import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsEmail,
  IsNotEmpty,
  IsArray,
} from 'class-validator';

export class EmailSignUpDto {
  @ApiProperty({ description: '사용자 이름' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '표시 이름' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ description: '이메일 주소' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '비밀번호' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: '동의한 약관 ID 목록', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  agreedTermsIds: string[];
}
