import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** 이 요청을 누가 했는가 — `PostRevisionService.record` 의 `actor` 에 그대로 넘긴다 */
export interface RequestActor {
  /** 로그인 세션의 사용자 또는 토큰의 주인. 비로그인(공개 경로)이면 null */
  userId: string | null;
  kind: 'SESSION' | 'TOKEN';
}

export function getRequestActor(request: Request): RequestActor {
  // 세션은 JwtStrategy.validate, 토큰은 JwtAuthGuard 가 채운 모양 — 둘 다 { id, isLogin }
  const user: { id?: string; isLogin?: boolean } | undefined = request.user;
  return {
    userId: user?.isLogin && user.id ? user.id : null,
    kind: request.apiToken ? 'TOKEN' : 'SESSION',
  };
}

/** @example create(@Actor() actor: RequestActor) */
export const Actor = createParamDecorator(
  (_: unknown, context: ExecutionContext): RequestActor =>
    getRequestActor(context.switchToHttp().getRequest<Request>()),
);
