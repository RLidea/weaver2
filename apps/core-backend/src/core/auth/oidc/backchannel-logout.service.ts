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
import { LockUsersCommand } from '../repositories/lock-users.command';

/** 시계 허용(초) — 포트의 iat 검사와 같은 값. jti 를 그만큼 더 쥔다 */
const CLOCK_TOLERANCE_SEC = 60;
/** jti 를 받아 주는 기간 끝에서 더 쥐는 여유(초) */
const JTI_MARGIN_SEC = 60;
/**
 * sid 묘비를 두는 기간 — refresh 행 하나가 가장 오래 사는 기간보다 길게. rememberMe 30일
 * (`SignInService.login`)에 회전의 올림(`Math.ceil` 로 하루까지)을 더해 31일
 */
export const REVOKED_SID_TTL_MS = 31 * 24 * 60 * 60 * 1000;

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
 * - `sid` 가 있으면 그 sid 로 받은 세션 행을 모두(회전으로 생긴 행 포함 — 회전이 sid 를 옮긴다) — `scope: 'session'`
 * - `sid` 없이 `sub` 만이면 `ssoSubject = sub` 인 사람의 refresh 행을 **모두**(sid 없는 행 · 앱 · 기기 행까지) —
 *   `scope: 'subject'`. 발급자는 비밀번호 변경 · 재설정 · 탈퇴에 이것을 보낸다(일부러 「전부 끊기」다)
 * - 지울 것이 없어도 성공이다(이미 로그아웃했거나 만료됨)
 *
 * jti 기록과 지우기는 **한 트랜잭션**이다 — 지우기가 실패하면 jti 도 남지 않아 발급자의 재시도가 닿는다.
 * 그 트랜잭션은 세션 주인의 `users` 행을 잠근다 — refresh 회전도 같은 행을 잠그므로, 회전이 지우기 사이에 끼어
 * 끝난 sid 로 새 행을 남기지 못한다. 그래도 남는 행에 대비해 sid 묘비(`oidc_revoked_sids`) · sub 의
 * `users.sessionsRevokedAt` 을 남기고, 회전은 그것을 보면 거절한다(IsRefreshSessionRevokedQuery).
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
      (claims.iat +
        LOGOUT_TOKEN_MAX_AGE_SEC +
        CLOCK_TOLERANCE_SEC +
        JTI_MARGIN_SEC) *
        1000,
    );

    // 받아 주는 기간이 지난 jti · 묘비는 버린다 — 그 토큰은 이제 iat 검사에서, 그 sid 의 행은 만료로 떨어진다
    await this.prisma.oidcLogoutJti.deleteMany({
      where: { expiresAt: { lt: new Date(now) } },
    });
    await this.prisma.oidcRevokedSid.deleteMany({
      where: { expiresAt: { lt: new Date(now) } },
    });

    let result: { userId: string | null; deleted: number };
    try {
      result = await this.prisma.$transaction(async (tx) => {
        await tx.oidcLogoutJti.create({
          data: { jti: claims.jti, expiresAt },
        });
        if (claims.sid) {
          // sub 도 왔으면 그 사람의 행만 — sid 가 엉뚱한 사람의 세션과 겹쳐도 지우지 않는다
          const where: Prisma.RefreshTokenWhereInput = {
            oidcSid: claims.sid,
            ...(claims.sub && { user: { ssoSubject: claims.sub } }),
          };
          const rows = await tx.refreshToken.findMany({
            where,
            select: { userId: true },
            distinct: ['userId'],
          });
          // 회전(SignInService.refresh)과 줄을 선다 — 진행 중인 회전이 끝난 뒤 지우므로 그 새 행도 지워진다
          await LockUsersCommand(
            tx,
            rows.map((r) => r.userId),
          );
          // 묘비 — 그래도 남은 행이 있으면 다음 회전이 막힌다
          await tx.oidcRevokedSid.upsert({
            where: { sid: claims.sid },
            create: {
              sid: claims.sid,
              sub: claims.sub ?? null,
              expiresAt: new Date(now + REVOKED_SID_TTL_MS),
            },
            update: { expiresAt: new Date(now + REVOKED_SID_TTL_MS) },
          });
          const { count } = await tx.refreshToken.deleteMany({ where });
          return { userId: rows[0]?.userId ?? null, deleted: count };
        }
        const user = await tx.user.findUnique({
          where: { ssoSubject: claims.sub! },
          select: { id: true },
        });
        if (!user) return { userId: null, deleted: 0 };
        await LockUsersCommand(tx, [user.id]);
        // 이 시각보다 먼저 만든 행은 회전하지 못한다(IsRefreshSessionRevokedQuery).
        // 시계는 refresh_tokens.createdAt 과 같은 앱 프로세스의 시계다 — Prisma 는 @default(now()) 를 DB 의
        // DEFAULT 가 아니라 클라이언트에서 채워 INSERT 에 싣는다(2026-10-19 쿼리 로그로 확인). DB now() 로
        // 찍으면 오히려 앱 · DB 시계가 어긋날 때 막 만든 로그인을 거절할 수 있다
        await tx.user.update({
          where: { id: user.id },
          data: { sessionsRevokedAt: new Date(now) },
        });
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

    const line = `Back-channel logout (${claims.sid ? 'session' : 'subject'}): sub=${claims.sub ?? '-'} userId=${userId ?? '-'} sessions=${result.deleted}`;
    if (claims.sid) {
      this.logger.log(line);
    } else {
      // 비밀번호 변경 · 재설정 · 탈퇴에서만 와야 한다. 평소 로그아웃마다 보이면 발급자 등록의
      // backchannel_logout_session_required 가 false 다 — 모든 로그아웃이 그 사람 전부를 끊는다
      this.logger.warn(
        `${line} — every session of this user was revoked; if this shows on ordinary logouts, check the issuer registration has backchannel_logout_session_required: true`,
      );
    }
    return {
      userId,
      meta: {
        sid: claims.sid,
        sub: claims.sub,
        scope: claims.sid ? 'session' : 'subject',
      },
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
