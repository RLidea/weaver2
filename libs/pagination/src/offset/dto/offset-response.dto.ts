import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

export class OffsetResponseDto<T> {
  @ApiProperty({ description: '전체 아이템 수' })
  total: number;

  @ApiProperty({ description: '페이지당 아이템 수' })
  limit: number;

  @ApiProperty({ description: '현재 페이지에 포함된 아이템 수' })
  currentItemCount: number;

  @ApiProperty({ description: '현재 페이지 번호' })
  currentPage: number;

  @ApiProperty({ description: '첫 페이지 번호' })
  firstPage: number;

  @ApiProperty({ description: '마지막 페이지 번호' })
  lastPage: number;

  @ApiProperty({
    type: Number,
    description: '다음 페이지 번호',
    nullable: true,
  })
  nextPage: number | null;

  @ApiProperty({
    type: Number,
    description: '이전 페이지 번호',
    nullable: true,
  })
  prevPage: number | null;

  // 제네릭이라 여기서는 타입을 특정할 수 없음. 실제 타입은 @ApiOffsetResponse() 믹스인이 채운다.
  @ApiHideProperty()
  data: T[];
}
