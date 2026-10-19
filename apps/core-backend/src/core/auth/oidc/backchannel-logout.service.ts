import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma, PrismaService } from '@weaver2/prisma';
import { OIDC_CLIENT, OidcClient } from './oidc-client';
import {
  LOGOUT_TOKEN_MAX_AGE_SEC,
  LogoutTokenError,
} from './oidc-logout-token';
import {
  OIDC_USER_HOOKS,
  OidcBackchannelLogoutMeta,
  OidcUserHooks,
  runOidcHook,
} from './oidc-user-hooks';

/** 시계 허용(초) — 포트의 iat 검사와 같은 값. jti 를 그만큼 더 쥔다 */
const CLOCK_TOLERANCE_SEC = 60;

/** 끝낸 로그아웃 — 훅에 넘긴다 */
export interface BackchannelLogoutResult {
  /** 지운 세션의 주인(sid) 또는 sub 로 찾은 사람. 아무것도 못 찾았으면 null */
  userId: string | null;
  meta: OidcBackchannelLogoutMeta;
  /** 지운 refresh 행 수 */
  deleted: number;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

/**
 * back-channel 로그아웃 — 검증한 logout_token 으로 이 앱의 세션(refresh 행)을 지운다.
 *
 * - `sid` 가 있으면 그 sid 로 받은 세션 행을 모두(회전으로 생긴 행 포함 — 회전이 sid 를 옮긴다)
 * - `sid` 없이 `sub` 만이면(`ACCOUNTS_OIDC_BACKCHANNEL_SESSION_REQUIRED=false` 일 때만 여기 온다)
 *   `ssoSubject = sub` 인 사람의 세션을 모두
 * - 지울 것이 없어도 성공이다(이미 로그아웃했거나 만료됨)
 *
 * jti 기록과 지우기는 **한 트랜잭션**이다 — 지우기가 실패하면 jti 도 남지 않아 발급자의 재시도가 닿는다.
 * access 토큰(JWT)은 지우지 못한다 — 만료(`JWT_EXPIRES_IN`)까지 살고, 그 뒤 refresh 가 401 이다.
 */
@Injectable()
export class BackchannelLogoutService {
  private readonly logger = new Logger(BackchannelLogoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OIDC_CLIENT) private readonly oidc: OidcClient,
    @Optional()
    @Inject(OIDC_USER_HOOKS)
    private readonly hooks: OidcUserHooks = {},
  ) {}

  /** 받을 수 없으면 `LogoutTokenError`(400), 발급자에 닿지 못하면 `OidcError` */
  async logout(token: string): Promise<BackchannelLogoutResult> {
    const claims = await this.oidc.verifyLogoutToken(token);
    const now = Date.now();
    const expiresAt = new Date(
      (claims.iat + LOGOUT_TOKEN_MAX_AGE_SEC + CLOCK_TOLERANCE_SEC) * 1000,
    );

    // 받아 주는 기간이 지난 jti 는 버린다 — 그 토큰은 이제 iat 검사에서 떨어진다
    await this.prisma.oidcLogoutJti.deleteMany({
      where: { expiresAt: { lt: new Date(now) } },
    });

    let result: { userId: string | null; deleted: number };
    try {
      result = await this.prisma.$transaction(async (tx) => {
        await tx.oidcLogoutJti.create({
          data: { jti: claims.jti, expiresAt },
        });
        if (claims.sid) {
          const rows = await tx.refreshToken.findMany({
            where: { oidcSid: claims.sid },
            select: { userId: true },
            distinct: ['userId'],
          });
          const { count } = await tx.refreshToken.deleteMany({
            where: { oidcSid: claims.sid },
          });
          return { userId: rows[0]?.userId ?? null, deleted: count };
        }
        const user = await tx.user.findUnique({
          where: { ssoSubject: claims.sub! },
          select: { id: true },
        });
        if (!user) return { userId: null, deleted: 0 };
        const { count } = await tx.refreshToken.deleteMany({
          where: { userId: user.id },
        });
        return { userId: user.id, deleted: count };
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new LogoutTokenError('"jti" was already used');
      }
      throw err;
    }

    // sid 로 지운 세션이 없을 때도 훅이 사람을 알 수 있게 sub 로 찾아 본다
    let userId = result.userId;
    if (!userId && claims.sub) {
      userId =
        (
          await this.prisma.user.findUnique({
            where: { ssoSubject: claims.sub },
            select: { id: true },
          })
        )?.id ?? null;
    }

    this.logger.log(
      `Back-channel logout: sub=${claims.sub ?? '-'} userId=${userId ?? '-'} sessions=${result.deleted}`,
    );
    return {
      userId,
      meta: { sid: claims.sid, sub: claims.sub },
      deleted: result.deleted,
    };
  }

  /** 응답을 보낸 뒤 부른다 — 훅이 발급자의 2.5초를 쓰지 않게. 던지지 않는다 */
  async afterLogout(result: BackchannelLogoutResult): Promise<void> {
    await runOidcHook(
      this.logger,
      'onBackchannelLogout',
      this.hooks.onBackchannelLogout &&
        (() => this.hooks.onBackchannelLogout!(result.userId, result.meta)),
    );
  }
}
