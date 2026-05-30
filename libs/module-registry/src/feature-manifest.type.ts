export type ModuleLayer = 'core' | 'features' | 'infrastructure' | 'system';
export type DependencyKind = 'hard' | 'soft';

export interface FeatureDependency {
  /** 의존 대상 모듈 id (다른 매니페스트의 id 또는 알려진 core 모듈) */
  id: string;
  /** hard: 직접 import, 없으면 컴파일 실패 / soft: 타입·데이터·이벤트, 없어도 컴파일 OK */
  kind: DependencyKind;
  /** 왜 의존하는지 (사람이 읽는 메모) */
  reason?: string;
}

export interface FeatureFootprint {
  /** 백엔드 모듈 디렉토리 (통째 삭제 대상) */
  backendDir?: string;
  /** 프론트 디렉토리들 (feature + admin 등 여러 곳) */
  frontendDirs?: string[];
  /** 분할된 Prisma 스키마 파일 */
  prismaSchema?: string;
  /** 이 모듈이 소유한 Prisma 모델명 (분기 시 제거 대상) */
  prismaModels?: string[];
  /** core 모델에 생긴 역참조 relation 필드 (제거 시 정리 — 무결성과 무관) */
  coreBackrefs?: string[];
  /** 권한 상수 키 (예: 'PERMISSIONS.BOARD') */
  permissions?: string;
  /** 시드 파일들 */
  seeds?: string[];
  /** Next.js 라우트 경로들 */
  routes?: string[];
  /** 흩어진 핀포인트 등록 지점. "파일경로 → 식별자" 형태 */
  pinpoints?: string[];
}

export interface RemovalNote {
  /** hard: 컴파일/기능이 깨짐(수작업) / soft: 자연 비활성 */
  severity: DependencyKind;
  location: string;
  note: string;
}

export interface FeatureManifest {
  /** 고유 id (= 디렉토리명) */
  id: string;
  layer: ModuleLayer;
  /** 한 줄 설명 */
  description: string;
  /** 이 모듈이 의존하는 상류 (역의존은 그래프가 계산) */
  dependsOn: FeatureDependency[];
  footprint: FeatureFootprint;
  /** 이 모듈 제거 시 영향받는 지점 */
  removalNotes: RemovalNote[];
}
