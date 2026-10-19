import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma } from '@weaver2/prisma';
import { PrismaService } from '@weaver2/prisma';
import { normalizeEmail } from '../utils/email.util';
import {
  generateUniqueDisplayName,
  generateUniqueUsername,
} from '../utils/user-naming';
import { OidcError } from './oidc-client';
import {
  OIDC_USER_HOOKS,
  OidcSignInMeta,
  OidcUserClaims,
  OidcUserHooks,
} from './oidc-user-hooks';

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

/**
 * 바깥 신원(sub)으로 사람을 찾거나 만든다 (D6). **이메일로 저절로 잇지 않는다**(Q12).
 *
 * ① `ssoSubject = sub` 인 행 → 그 사람. 탈퇴면 `account_deleted`. 발급자가 인증한 이메일이
 *    바뀌었으면 맞춘다(`emailVerifiedAt = now`) — 다른 살아 있는 행이 쓰면 건너뛰고 로그인은 된다
 * ② 모르는 sub 인데 같은 이메일의 살아 있는 행 → `sso_conflict`. 잇지 않는다(`onConflict` 훅)
 * ③ 모르는 sub · 같은 이메일 없음 · 이메일 미인증 → `sso_email_unverified`
 * ④ 그 이메일을 탈퇴한 행이 아직 쥐고 있음 → `account_deleted` (weaver2 는 탈퇴 때 이메일을
 *    익명화하지 않는다 — 파생 프로젝트가 탈퇴 훅에서 익명화하면 이 갈래는 오지 않는다)
 * ⑤ 그 밖 → 새로 만든다. `LocalCredential` · 약관 행 없음, `emailVerifiedAt = now`
 *
 * 만드는 중 P2002(같은 sub 가 거의 동시에 둘 · 이메일 경합)면 ①부터 **한 번만** 다시 찾는다.
 * 로그에는 sub 와 행 id 만 남긴다 — 이메일은 남기지 않는다.
 */
@Injectable()
export class OidcSubjectService {
  private readonly logger = new Logger(OidcSubjectService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(OIDC_USER_HOOKS)
    private readonly hooks: OidcUserHooks = {},
  ) {}

  async resolve(
    claims: OidcUserClaims,
    meta: Omit<OidcSignInMeta, 'created'>,
  ): Promise<{ userId: string; created: boolean }> {
    try {
      return await this.findOrCreate(claims, meta);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      this.logger.warn(`SSO create raced, looking up again: sub=${claims.sub}`);
      try {
        return await this.findOrCreate(claims, meta);
      } catch (again) {
        if (isUniqueViolation(again)) {
          throw new OidcError('sso_failed', 'SSO user create kept colliding');
        }
        throw again;
      }
    }
  }

  /** 세션을 준 뒤 — 훅이 던져도 로그인은 그대로다 */
  async afterSignIn(userId: string, meta: OidcSignInMeta): Promise<void> {
    await this.callHook('afterSignIn', () =>
      this.hooks.afterSignIn?.(userId, meta),
    );
  }

  private async findOrCreate(
    claims: OidcUserClaims,
    meta: Omit<OidcSignInMeta, 'created'>,
  ): Promise<{ userId: string; created: boolean }> {
    const email = claims.email ? normalizeEmail(claims.email) : undefined;

    // ① sub 로만 찾는다
    const linked = await this.prisma.user.findUnique({
      where: { ssoSubject: claims.sub },
      select: { id: true, email: true, deletedAt: true },
    });
    if (linked) {
      if (linked.deletedAt) {
        throw new OidcError('account_deleted', 'SSO user is deleted');
      }
      if (claims.email_verified && email && email !== linked.email) {
        await this.syncEmail(linked.id, email, claims.sub);
      }
      return { userId: linked.id, created: false };
    }

    if (!email) {
      throw new OidcError(
        'sso_failed',
        `SSO userinfo has no email: sub=${claims.sub}`,
      );
    }

    // ② 같은 이메일의 살아 있는 행 — 잇지 않는다
    const sameEmail = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    if (sameEmail) {
      this.logger.warn(
        `SSO conflict: unknown sub=${claims.sub} matches existing userId=${sameEmail.id}`,
      );
      await this.callHook('onConflict', () =>
        this.hooks.onConflict?.(sameEmail.id, claims.sub, {
          ...meta,
          created: false,
        }),
      );
      throw new OidcError(
        'sso_conflict',
        'SSO email belongs to an existing user',
      );
    }

    // ③ 미인증 이메일로는 만들지 않는다
    if (!claims.email_verified) {
      throw new OidcError(
        'sso_email_unverified',
        `SSO email not verified: sub=${claims.sub}`,
      );
    }

    // ④ 탈퇴한 행이 그 이메일을 쥐고 있다
    const deleted = await this.prisma.user.findFirst({
      where: { email, deletedAt: { not: null } },
      select: { id: true },
    });
    if (deleted) {
      throw new OidcError(
        'account_deleted',
        `SSO email belongs to a deleted userId=${deleted.id}`,
      );
    }

    // ⑤ 새로 만든다
    const names = await this.names(claims, email);
    const user = await this.prisma.user.create({
      data: {
        email,
        username: names.username,
        displayName: names.displayName,
        ssoSubject: claims.sub,
        emailVerifiedAt: new Date(),
      },
      select: { id: true },
    });
    this.logger.log(`SSO user created: userId=${user.id} sub=${claims.sub}`);
    return { userId: user.id, created: true };
  }

  /** 발급자가 인증한 새 이메일로 맞춘다. 다른 행이 쓰고 있으면 건너뛴다(로그인은 된다) */
  private async syncEmail(userId: string, email: string, sub: string) {
    const taken = await this.prisma.user.findFirst({
      where: { email, id: { not: userId } },
      select: { id: true },
    });
    if (taken) {
      this.logger.warn(
        `SSO email sync skipped: sub=${sub} userId=${userId} — address used by userId=${taken.id}`,
      );
      return;
    }
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { email, emailVerifiedAt: new Date() },
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      this.logger.warn(
        `SSO email sync skipped (race): sub=${sub} userId=${userId}`,
      );
    }
  }

  private async names(
    claims: OidcUserClaims,
    email: string,
  ): Promise<{ username: string; displayName: string }> {
    if (this.hooks.names) {
      try {
        return await this.hooks.names(claims);
      } catch (err) {
        this.logger.warn(
          `OIDC_USER_HOOKS.names failed, using defaults: ${(err as Error).message}`,
        );
      }
    }
    return {
      username: await generateUniqueUsername(this.prisma, 'sso', claims.sub),
      displayName: await generateUniqueDisplayName(
        this.prisma,
        claims.name ?? claims.preferred_username ?? email.split('@')[0],
      ),
    };
  }

  private async callHook(name: string, fn: () => unknown) {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(
        `OIDC_USER_HOOKS.${name} failed: ${(err as Error).message}`,
      );
    }
  }
}
