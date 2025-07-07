import { ApiProperty } from '@nestjs/swagger';

export class UnauthorizedResponseDto {
  @ApiProperty({ example: 401, description: '상태 코드' })
  statusCode: number;

  @ApiProperty({ example: 'Unauthorized', description: '에러 메시지' })
  message: string;
}

export class NotFoundResponseDto {
  @ApiProperty({ example: 404, description: '상태 코드' })
  statusCode: number;

  @ApiProperty({ example: 'Not Found', description: '에러 메시지' })
  message: string;
}
