import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DependencyKind, ModuleLayer } from '@weaver2/module-registry';

export class ModuleGraphEdgeDto {
  @ApiProperty({ description: '의존하는 쪽 모듈 id (하류)' })
  from: string;

  @ApiProperty({ description: '의존받는 쪽 모듈 id (상류)' })
  to: string;

  @ApiProperty({ enum: ['hard', 'soft'], description: '의존 강도' })
  kind: DependencyKind;
}

export class ModuleFootprintDto {
  @ApiPropertyOptional({ description: '백엔드 모듈 디렉토리' })
  backendDir?: string;

  @ApiPropertyOptional({ description: '이 모듈이 소유한 Prisma 모델명 목록', type: [String] })
  prismaModels?: string[];

  @ApiPropertyOptional({ description: '권한 상수 키 목록', type: [String] })
  permissions?: string[];
}

export class ModuleDependencyDto {
  @ApiProperty({ description: '의존 대상 모듈 id' })
  id: string;

  @ApiProperty({ enum: ['hard', 'soft'], description: '의존 강도' })
  kind: DependencyKind;

  @ApiPropertyOptional({ description: '의존 이유' })
  reason?: string;
}

export class ModuleItemDto {
  @ApiProperty({ description: '모듈 고유 id' })
  id: string;

  @ApiProperty({ enum: ['core', 'features', 'infrastructure', 'system'], description: '레이어' })
  layer: ModuleLayer;

  @ApiProperty({ description: '한 줄 설명' })
  description: string;

  @ApiProperty({ type: [ModuleDependencyDto], description: '이 모듈이 의존하는 상류' })
  dependsOn: ModuleDependencyDto[];

  @ApiProperty({ type: [String], description: '이 모듈에 의존하는 하류 모듈 id 목록 (계산됨)' })
  dependents: string[];

  @ApiProperty({ type: ModuleFootprintDto, description: '모듈 발자국 정보' })
  footprint: ModuleFootprintDto;
}

export class ModuleGraphStatsDto {
  @ApiProperty({ description: '전체 모듈 수' })
  moduleCount: number;

  @ApiProperty({ description: '전체 엣지 수' })
  edgeCount: number;

  @ApiProperty({ description: 'hard 의존 엣지 수' })
  hardCount: number;

  @ApiProperty({ description: 'soft 의존 엣지 수' })
  softCount: number;
}

export class ModuleGraphDto {
  @ApiProperty({ type: [ModuleItemDto], description: '모듈 목록' })
  modules: ModuleItemDto[];

  @ApiProperty({ type: [ModuleGraphEdgeDto], description: '의존 엣지 목록' })
  edges: ModuleGraphEdgeDto[];

  @ApiProperty({ type: ModuleGraphStatsDto, description: '통계' })
  stats: ModuleGraphStatsDto;
}
