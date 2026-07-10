import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

export class KeysetResponseDto<T> {
  // 제네릭이라 여기서는 타입을 특정할 수 없음. 실제 타입은 @ApiKeysetResponse() 믹스인이 채운다.
  @ApiHideProperty()
  data: T[];

  @ApiProperty({
    type: String,
    description: '다음 페이지 조회를 위한 커서',
    nullable: true,
  })
  nextCursor: string | null;

  @ApiProperty({ description: '다음 페이지 존재 여부' })
  hasNextPage: boolean;

  @ApiProperty({ description: '페이지당 아이템 수' })
  limit: number;
}
