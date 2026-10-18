import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  ForbiddenException,
  Get,
  Res,
  UseFilters,
} from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { RequirePermission } from '../../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { ApiExcludeController } from '@nestjs/swagger';

// root 를 주는 이유는 admin-auth.view-controller.ts 의 ASSETS_ROOT 주석과 같다
const ADMIN_ASSETS_ROOT = join(
  process.cwd(),
  'apps/core-backend/src/assets/admin',
);

/**
 * 로그인은 했지만 관리자 화면 권한이 없는 사람에게 403 자리에서 출구(로그아웃)를 준다.
 *
 * 전역 HttpExceptionFilter 는 브라우저의 401·403 을 /admin/login 으로 보내는데, 로그인
 * 화면은 refresh 쿠키가 살아 있으면 곧장 여기로 되돌려 보낸다 — 권한이 없으면 무한
 * 리다이렉트다. 401 은 그대로 전역 필터에 맡긴다(로그인 화면이 맞는 출구다).
 */
@Catch(ForbiddenException)
class AdminNoAccessViewFilter implements ExceptionFilter {
  catch(_exception: ForbiddenException, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(403)
      .sendFile('admin-no-access.html', { root: ADMIN_ASSETS_ROOT });
  }
}

@ApiExcludeController()
@Controller({ path: 'admin' })
@RequirePermission(PERMISSIONS.ADMIN.SECURITY)
@UseFilters(AdminNoAccessViewFilter)
export class AdminDashboardViewController {
  @Get()
  toSecurity(@Res() res: Response) {
    return res.redirect('/admin/security');
  }

  @Get('security')
  getSecurityPage(@Res() res: Response) {
    res.sendFile('admin-security.html', { root: ADMIN_ASSETS_ROOT });
  }
}
