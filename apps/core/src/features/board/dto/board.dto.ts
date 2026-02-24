import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BoardDto {
  @ApiProperty({ description: 'Board ID' })
  id: string;

  @ApiProperty({ description: 'Board name' })
  name: string;

  @ApiProperty({ description: 'Board description', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: '소프트 삭제 시각 (null이면 삭제되지 않음)',
  })
  deletedAt: Date | null;
}
