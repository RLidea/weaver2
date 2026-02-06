import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * 권한 체크 데코레이터
 * @example @RequirePermission('post:create')
 * @example @RequirePermission(['post:create', 'post:update:own'])
 */
export const RequirePermission = (permissions: string | string[]) =>
  SetMetadata(
    PERMISSIONS_KEY,
    Array.isArray(permissions) ? permissions : [permissions],
  );
