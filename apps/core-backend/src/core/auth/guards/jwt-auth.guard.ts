import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@weaver2/common/decorator/public.decorator';

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
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
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
