/**
 * import 경로(moduleSpecifier) → 의존 모듈 id 매핑.
 * 매칭 안 되면 의존 아님(공용 인프라/프레임워크: common/prisma/pagination/shared/nestjs 등).
 */
export interface KnownModule {
  test: RegExp;
  id: string;
}

export const KNOWN_MODULES: KnownModule[] = [
  { test: /\/core\/permission\//, id: 'permission' },
  { test: /\/core\/notification\//, id: 'notification' },
  { test: /\/core\/auth\//, id: 'auth' },
  { test: /\/core\/user\//, id: 'user' },
  { test: /\/core\/terms\//, id: 'terms' },
  { test: /@weaver2\/upload/, id: 'upload' },
  { test: /@weaver2\/email/, id: 'email' },
];

/** import 경로를 모듈 id로. 없으면 null. features 간 의존(../<feature>/)은 featureIds로 별도 판정. */
export function resolveModuleId(importPath: string): string | null {
  for (const m of KNOWN_MODULES) {
    if (m.test.test(importPath)) return m.id;
  }
  return null;
}
