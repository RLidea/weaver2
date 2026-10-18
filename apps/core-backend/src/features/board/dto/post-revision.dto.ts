import { ApiProperty } from '@nestjs/swagger';
import { PostRevisionActorKind } from '@weaver2/prisma';

export class PostRevisionActorDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'Display name' })
  displayName: string;
}

/** 판 목록의 한 줄 — 본문은 없다 */
export class PostRevisionSummaryDto {
  @ApiProperty({ description: 'Revision ID' })
  id: string;

  @ApiProperty({ description: 'Post ID' })
  postId: string;

  @ApiProperty({ description: '이 판의 제목' })
  title: string;

  @ApiProperty({
    description: '판을 남긴 사용자 ID (익명이거나 탈퇴했으면 null)',
    type: String,
    nullable: true,
  })
  actorUserId: string | null;

  @ApiProperty({
    description: '판을 남긴 주체 — 로그인 세션 또는 범위 토큰',
    enum: PostRevisionActorKind,
  })
  actorKind: PostRevisionActorKind;

  @ApiProperty({
    description: '판을 남긴 사용자',
    type: PostRevisionActorDto,
    nullable: true,
  })
  actorUser: PostRevisionActorDto | null;

  @ApiProperty({ description: '판을 남긴 시각' })
  createdAt: Date;
}

/** 판 전문 */
export class PostRevisionDto extends PostRevisionSummaryDto {
  @ApiProperty({ description: '이 판의 본문' })
  content: string;
}
