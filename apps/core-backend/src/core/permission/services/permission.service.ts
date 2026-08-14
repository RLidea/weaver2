import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@weaver2/prisma';

type CacheStrategy = 'memory' | 'none';

interface CacheEntry {
  permissions: Set<string>;
  expiresAt: number;
}

@Injectable()
export class PermissionService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheStrategy: CacheStrategy;
  private readonly cacheTtlMs: number;
  private readonly maxCacheSize: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.cacheStrategy =
      (this.configService.get<string>(
        'PERMISSION_CACHE_STRATEGY',
      ) as CacheStrategy) || 'memory';
    this.cacheTtlMs =
      (this.configService.get<number>('PERMISSION_CACHE_TTL') || 300) * 1000;
    this.maxCacheSize =
      this.configService.get<number>('PERMISSION_CACHE_MAX_SIZE') || 1000;
  }

  /**
   * 유저의 모든 권한을 DB에서 로드
   */
  async getUserPermissions(userId: string): Promise<Set<string>> {
    // 캐시 전략이 memory일 때만 캐시 확인
    if (this.cacheStrategy === 'memory') {
      const cached = this.cache.get(userId);
      if (cached && cached.expiresAt > Date.now()) {
        // LRU 순서 갱신: 삭제 후 재삽입으로 맨 뒤로 이동
        this.cache.delete(userId);
        this.cache.set(userId, cached);
        return cached.permissions;
      }
    }

    // DB에서 유저의 모든 권한 그룹과 권한 조회
    const permissions = await this.loadPermissionsFromDb(userId);

    // 캐시 전략이 memory일 때만 캐시 저장
    if (this.cacheStrategy === 'memory') {
      // LRU: 최대 크기 초과 시 가장 오래된 항목 제거
      if (this.cache.size >= this.maxCacheSize) {
        const oldestKey = this.cache.keys().next().value as string | undefined;
        if (oldestKey !== undefined) {
          this.cache.delete(oldestKey);
        }
      }

      this.cache.set(userId, {
        permissions,
        expiresAt: Date.now() + this.cacheTtlMs,
      });
    }

    return permissions;
  }

  /**
   * DB에서 유저의 권한을 직접 조회
   */
  private async loadPermissionsFromDb(userId: string): Promise<Set<string>> {
    const userGroups = await this.prisma.userPermissionGroup.findMany({
      where: { userId },
      include: {
        permissionGroup: {
          include: {
            permissions: true,
          },
        },
      },
    });

    const permissions = new Set<string>();
    for (const userGroup of userGroups) {
      for (const perm of userGroup.permissionGroup.permissions) {
        permissions.add(perm.permission);
      }
    }

    return permissions;
  }

  /**
   * 유저가 특정 권한을 가지고 있는지 체크
   * 와일드카드 지원: *:* (슈퍼관리자), resource:* (리소스 전체)
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);

    // 1. 슈퍼 관리자 체크 (*:*)
    if (userPermissions.has('*:*')) {
      return true;
    }

    // 2. 리소스 와일드카드 체크 (resource:*)
    const [resource] = permission.split(':');
    if (userPermissions.has(`${resource}:*`)) {
      return true;
    }

    // 3. 정확한 권한 매칭
    return userPermissions.has(permission);
  }

  /**
   * 유저가 여러 권한 중 하나라도 가지고 있는지 체크
   */
  async hasAnyPermission(
    userId: string,
    permissions: string[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 유저가 모든 권한을 가지고 있는지 체크
   */
  async hasAllPermissions(
    userId: string,
    permissions: string[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, permission))) {
        return false;
      }
    }
    return true;
  }

  /**
   * 리소스별 접근 권한 체크
   * - 규칙 없으면 기본 거부 — **`*:*` 보유자도 마찬가지다.** 규칙의 부재는 설정이
   *   덜 된 것이지 "누구나 된다" 가 아니므로, 슈퍼관리자 예외도 규칙이 있을 때만 적용된다
   * - 규칙이 있으면 `*:*` 보유자는 그룹 목록과 무관하게 통과 (아래 4번)
   * - public 리소스는 allowAnonymous: true + allowedGroups 비어있음으로 설정
   *
   * @param userId 유저 ID (null이면 비로그인)
   * @param resourceType 리소스 타입 (예: 'board')
   * @param resourceId 리소스 ID (예: 게시판 ID)
   * @param action 액션 (예: 'read', 'write', 'comment')
   */
  async hasResourcePermission(
    userId: string | null,
    resourceType: string,
    resourceId: string,
    action: string,
  ): Promise<boolean> {
    // 1. ResourcePermission 규칙 조회
    const rule = await this.prisma.resourcePermission.findUnique({
      where: {
        resourceType_resourceId_action: {
          resourceType,
          resourceId,
          action,
        },
      },
      include: {
        allowedGroups: true,
        deniedGroups: true,
      },
    });

    // 2. 규칙 없으면 기본 거부
    if (!rule) {
      return false;
    }

    // 3. 비로그인 처리
    if (!userId) {
      return rule.allowAnonymous;
    }

    // 4. 슈퍼관리자는 자원 규칙에 막히지 않는다
    //
    // 이 규칙 체계는 **그룹 소속만** 본다. 그래서 `*:*` 를 가진 계정이라도 허용 그룹
    // 목록(`['Admin']` 등)에 자기 그룹이 없으면 막혔다 — 시스템의 모든 권한을 가졌는데
    // 자원 앞에서만 아무것도 아닌 사람이 되는 셈이라, `hasPermission` 과 답이 어긋난다.
    //
    // **거부 그룹보다 위에 둔 것은 의도다.** 위의 `hasPermission` 이 `*:*` 를 맨 처음
    // 무조건 검사하므로, 두 함수가 같은 계정을 다르게 판정하지 않게 맞춘다. 대가로 특정
    // 자원에서 슈퍼관리자만 막는 길은 사라진다 — 지금 쓰는 곳이 없고, 필요해지면 그때
    // 이 분기를 거부 그룹 검사 아래로 내리면 된다.
    //
    // ⚠️ `hasPermission()` 을 부르면 안 된다. 그 함수는 `*:*` 보유자에게 어떤 문자열도
    // 참으로 주므로 검사가 항상 통과해 의미가 없어진다. 캐시된 권한 집합에서 **정확
    // 일치**로 본다(추가 조회 없음).
    const userPermissions = await this.getUserPermissions(userId);
    if (userPermissions.has('*:*')) {
      return true;
    }

    // 5. 유저의 그룹 목록 조회
    const userGroupIds = await this.getUserGroupIds(userId);

    // 6. 거부 그룹 체크 (일반 사용자 중에서는 우선)
    const deniedGroupIds = rule.deniedGroups.map((g) => g.permissionGroupId);
    if (userGroupIds.some((id) => deniedGroupIds.includes(id))) {
      return false;
    }

    // 7. 허용 그룹이 비어있으면 로그인만 하면 허용
    const allowedGroupIds = rule.allowedGroups.map((g) => g.permissionGroupId);
    if (allowedGroupIds.length === 0) {
      return true;
    }

    // 8. 허용 그룹 체크
    return userGroupIds.some((id) => allowedGroupIds.includes(id));
  }

  /**
   * 유저가 속한 그룹 ID 목록 조회
   */
  private async getUserGroupIds(userId: string): Promise<string[]> {
    const userGroups = await this.prisma.userPermissionGroup.findMany({
      where: { userId },
      select: { permissionGroupId: true },
    });

    return userGroups.map((ug) => ug.permissionGroupId);
  }

  /**
   * 특정 유저의 캐시 무효화
   */
  invalidateCache(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * 전체 캐시 무효화
   */
  invalidateAllCache(): void {
    this.cache.clear();
  }
}
