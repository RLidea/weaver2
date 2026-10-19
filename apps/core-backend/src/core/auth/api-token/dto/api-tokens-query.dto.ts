import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ApiTokensQueryDto {
  @ApiPropertyOptional({ description: '이 사용자의 토큰만' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
