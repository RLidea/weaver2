import type { Prisma } from '@weaver2/prisma';

/**
 * 탈퇴(본인 · 관리자)가 끝나기 직전, 같은 트랜잭션 안에서 파생 프로젝트가 덧붙이는 정리 자리.
 * SoftDeleteUserCommand 다음에 차례로 불린다. 하나라도 던지면 탈퇴 전체가 되돌려진다.
 * 익명화 · 개인 행 삭제처럼 「탈퇴하면 남기지 않는다」를 파생 프로젝트가 자기 표에 거는 곳이다.
 *
 * 파생 프로젝트는 전역 모듈에서 이 토큰으로 함수 목록을 내준다 (AUTH_PROVIDER_EXTRAS 와 같은 모양).
 *
 * @example
 * ```ts
 * @Global()
 * @Module({
 *   providers: [{
 *     provide: USER_WITHDRAWAL_HOOKS,
 *     useValue: [
 *       async (tx, userId) => { await tx.notification.deleteMany({ where: { userId } }); },
 *     ] satisfies UserWithdrawalHook[],
 *   }],
 *   exports: [USER_WITHDRAWAL_HOOKS],
 * })
 * export class WithdrawalHooksModule {}
 * ```
 */
export const USER_WITHDRAWAL_HOOKS = Symbol('USER_WITHDRAWAL_HOOKS');

export type UserWithdrawalHook = (
  tx: Prisma.TransactionClient,
  userId: string,
) => Promise<void>;
