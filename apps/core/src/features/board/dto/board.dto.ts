import { ApiProperty } from '@nestjs/swagger';

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
}
