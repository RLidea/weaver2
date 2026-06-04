import type { PrismaClient } from '@prisma/client';
import { logSeedResult } from './seed-logger';

/**
 * Banner 모듈 시드.
 * banner는 전역 권한(banner:manage)만 사용하며 리소스별 권한이 없다.
 * 권한 그룹 매핑은 permission-group.seed.ts가 담당한다.
 * 이 시드는 footprint seeds 슬롯을 채우고, 향후 샘플 배너 데이터 자리로 둔다.
 */
export async function seedBannerPermissions(_prisma: PrismaClient): Promise<void> {
  logSeedResult('Banner', 'permission groups (via permission-group.seed)', 'exists');
}
