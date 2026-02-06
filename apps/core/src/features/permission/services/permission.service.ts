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
