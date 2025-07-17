import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
