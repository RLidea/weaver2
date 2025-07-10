import { ApiProperty } from '@nestjs/swagger';

export class BoardDto {
  @ApiProperty({ description: '게시판 ID' })
  id: string;

  @ApiProperty({ description: '게시판 이름' })
  name: string;

  @ApiProperty({ description: '게시판 설명' })
  description: string | null;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;
}
