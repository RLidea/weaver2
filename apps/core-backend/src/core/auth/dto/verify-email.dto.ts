import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: '인증 메일 링크에 실린 토큰',
    example: 'a1b2c3d4e5f6g7h8',
  })
  token: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description:
      '가입 때 정한 비밀번호 — 링크를 누른 사람이 가입한 사람과 같은지 확인한다',
    example: 'securePassword123',
  })
  password: string;
}
