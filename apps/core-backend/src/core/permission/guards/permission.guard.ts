import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 권한 데코레이터가 없으면 통과
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id: string }; apiToken?: unknown }>();
    const user = request.user;

    // 범위 토큰은 권한을 갖지 않는다 — 주인의 권한이 따라가지 않는다(범위 경로는 @ApiTokenScope 가 연다)
    if (request.apiToken) {
      throw new ForbiddenException('API 토큰으로는 이 작업을 할 수 없습니다.');
    }

    // 로그인하지 않은 사용자
    if (!user?.id) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    // 필요한 권한 중 하나라도 있으면 통과
    const hasPermission = await this.permissionService.hasAnyPermission(
      user.id,
      requiredPermissions,
    );

    if (!hasPermission) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    return true;
  }
}
