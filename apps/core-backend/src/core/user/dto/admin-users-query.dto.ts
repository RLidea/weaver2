import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';

export enum UserStatusFilter {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  ALL = 'all',
}

export class AdminUsersQueryDto extends PaginationRequestDto {
  @ApiPropertyOptional({
    description: '사용자 상태 필터',
    enum: UserStatusFilter,
    default: UserStatusFilter.ALL,
  })
  @IsOptional()
  @IsEnum(UserStatusFilter)
  status?: UserStatusFilter = UserStatusFilter.ALL;
}
