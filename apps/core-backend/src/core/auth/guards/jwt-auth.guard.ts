import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '@weaver2/common/decorator/public.decorator';
import { ApiTokenService } from '../api-token/api-token.service';
import { parseApiToken } from '../api-token/api-token.crypto';
import { API_TOKEN_SCOPE_KEY } from '../api-token/decorators/api-token-scope.decorator';

/**
 * 모든 라우트의 인증 가드.
 *
 * - 보호 라우트: `JwtStrategy` 가 토큰을 검증하고, 실패하면 401.
 * - `@Public()` 라우트: **같은 `JwtStrategy` 로** 검증하되, 실패해도 막지 않고
 *   비로그인(`{ isLogin: false }`)으로 다룬다 — 공개 게시판이 로그인한 사람에게만
 *   더 보여 줄 수 있게.
 *
 * 🔴 공개 라우트에서 토큰을 따로 검증하지 않는다. 예전에는 여기서 `jwtService.verify`
 *    로 서명만 봐서, pre-auth 토큰(2FA 전)·탈퇴·정지된 사용자의 토큰이 공개 라우트에서
 *    로그인으로 통했다. 검증이 두 곳에 있으면 한쪽만 고쳐지고 다른 쪽이 구멍으로 남는다.
 *    토큰의 종류(aud)·탈퇴·정지 판단은 `JwtStrategy` 한 곳에만 둔다.
 *
 * 범위 토큰(`Authorization: Bearer wvt_…`)은 앞머리에서 따로 간다 — 세션 갈래는 그대로다.
 * - `@ApiTokenScope` 가 없는 경로(공개 경로 포함)에서는 401. DB 를 읽지 않는다
 * - 토큰이 죽었으면(없음 · 끊김 · 만료 · 주인 탈퇴 · 정지) 401, 범위가 모자라면 403
 * - 통과하면 `req.user` 는 주인, `req.apiToken` 이 붙는다. 권한은 따라가지 않는다(PermissionGuard)
 * 헤더가 토큰 모양이면 쿠키 세션보다 앞선다 — 세션으로 넘어가 권한을 얻는 길이 없게.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly apiTokenService: ApiTokenService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const presented = parseApiToken(request.headers.authorization);
    if (!presented) {
      return super.canActivate(context) as Promise<boolean>;
    }

    const scope = this.reflector.getAllAndOverride<string | undefined>(
      API_TOKEN_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!scope) throw new UnauthorizedException();

    const token = await this.apiTokenService.verify(presented);
    if (!token) throw new UnauthorizedException();
    if (!token.scopes.includes(scope)) {
      throw new ForbiddenException('이 토큰의 범위 밖입니다.');
    }

    await this.apiTokenService.markUsed(token.id);
    (request as { user?: unknown }).user = {
      id: token.user.id,
      username: token.user.username,
      isLogin: true,
    };
    request.apiToken = { id: token.id, scopes: token.scopes };
    return true;
  }

  handleRequest<TUser = unknown>(
    // 부모(AuthGuard) 시그니처 그대로 — passport 가 무엇을 던지든 그대로 다시 던진다
    err: any,
    user: TUser | false | null,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (this.isPublic(context)) {
      // 검증 실패(없음·만료·종류 다름·탈퇴·정지)는 비로그인일 뿐, 요청은 통과시킨다.
      // err 는 검증 실패가 아니라 검증 도중의 장애(DB 등)라 그대로 올린다 — 숨기면
      // 로그인한 사람이 조용히 비로그인 화면을 보게 된다.
      if (err) throw err;
      // 요청마다 새 객체 — 공유 객체를 누가 고치면 다른 요청으로 번진다
      return (user || { isLogin: false }) as TUser;
    }
    return super.handleRequest(err, user, info, context);
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }
}
