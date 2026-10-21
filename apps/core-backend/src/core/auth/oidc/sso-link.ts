import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@weaver2/prisma';
import { normalizeEmail } from '../utils/email.util';
import { LockUsersCommand } from '../repositories/lock-users.command';
import { OidcUserHooks, runOidcHook } from './oidc-user-hooks';

/**
 * 운영자 손 — 이미 있는 행을 바깥 신원(sub)에 한 번 잇고(`pnpm sso:link`), 풀고(`pnpm sso:unlink`).
 *
 * SSO 로그인은 이메일로 저절로 잇지 않는다(같은 이메일이면 `sso_conflict`). 이어야 할 행은
 * 사람이 계정 서버 쪽 조회(그 sub 의 이메일 · 인증 여부)를 **눈으로 대조한 뒤** 여기서 잇는다.
 * 이 스크립트는 계정 서버를 보지 못한다. 기본은 미리보기이고 `--apply` 일 때만 쓴다.
 * 몇 번 돌려도 같다 — 이미 이어졌으면 아무것도 하지 않는다.
 */

/** 이메일이 같거나 그 sub 를 쥔 행 (탈퇴 행 포함) */
export interface LinkRow {
  id: string;
  email: string;
  ssoSubject: string | null;
  deletedAt: Date | null;
}

export type LinkPlan =
  | { action: 'link'; userId: string; sub: string }
  | { action: 'already-linked'; userId: string; sub: string }
  | { action: 'stop'; reason: string };

export type UnlinkPlan =
  | { action: 'unlink'; userId: string; sub: string }
  | { action: 'already-unlinked'; userId: string }
  | { action: 'stop'; reason: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function planLink(
  rows: LinkRow[],
  email: string,
  sub: string,
): LinkPlan {
  if (!UUID.test(sub)) {
    return { action: 'stop', reason: 'sub 가 uuid 모양이 아닙니다' };
  }
  const target = normalizeEmail(email);
  const matches = rows.filter((r) => r.email === target);
  if (matches.length === 0) {
    return { action: 'stop', reason: '그 이메일의 행이 없습니다' };
  }
  if (matches.length > 1) {
    return { action: 'stop', reason: '그 이메일의 행이 둘 이상입니다' };
  }
  const [row] = matches;
  if (row.deletedAt) {
    return { action: 'stop', reason: '탈퇴한 행입니다' };
  }
  if (row.ssoSubject === sub) {
    return { action: 'already-linked', userId: row.id, sub };
  }
  if (row.ssoSubject) {
    return {
      action: 'stop',
      reason: '이미 다른 sub 에 이어져 있습니다 — 먼저 pnpm sso:unlink',
    };
  }
  if (rows.some((r) => r.ssoSubject === sub && r.id !== row.id)) {
    return { action: 'stop', reason: '다른 행이 그 sub 를 쥐고 있습니다' };
  }
  return { action: 'link', userId: row.id, sub };
}

export function planUnlink(rows: LinkRow[], email: string): UnlinkPlan {
  const target = normalizeEmail(email);
  const matches = rows.filter((r) => r.email === target);
  if (matches.length !== 1) {
    return {
      action: 'stop',
      reason:
        matches.length === 0
          ? '그 이메일의 행이 없습니다'
          : '그 이메일의 행이 둘 이상입니다',
    };
  }
  const [row] = matches;
  if (row.deletedAt) {
    return { action: 'stop', reason: '탈퇴한 행입니다' };
  }
  if (!row.ssoSubject) {
    return { action: 'already-unlinked', userId: row.id };
  }
  return { action: 'unlink', userId: row.id, sub: row.ssoSubject };
}

type Db = PrismaClient | Prisma.TransactionClient;

/** 계획에 넣을 행 — 이메일이 같거나 그 sub 를 쥔 행 */
export function findLinkRows(
  prisma: Db,
  email: string,
  sub?: string,
): Promise<LinkRow[]> {
  return prisma.user.findMany({
    where: {
      OR: [
        { email: normalizeEmail(email) },
        ...(sub ? [{ ssoSubject: sub }] : []),
      ],
    },
    select: { id: true, email: true, ssoSubject: true, deletedAt: true },
  });
}

const logger = new Logger('SsoLink');

function callHook(name: string, fn: (() => unknown) | undefined) {
  return runOidcHook(logger, name, fn);
}

/** 잇는다 — 그사이 누가 먼저 이었으면(ssoSubject 가 null 이 아니면) 쓰지 않고 던진다 */
export async function applyLink(
  prisma: PrismaClient,
  plan: Extract<LinkPlan, { action: 'link' }>,
  hooks?: OidcUserHooks,
): Promise<void> {
  const { count } = await prisma.user.updateMany({
    where: { id: plan.userId, ssoSubject: null, deletedAt: null },
    data: { ssoSubject: plan.sub },
  });
  if (count !== 1) {
    throw new Error('행이 그사이 바뀌었습니다 — 미리보기부터 다시 하세요');
  }
  logger.log(`SSO linked: userId=${plan.userId} sub=${plan.sub}`);
  await callHook(
    'onLink',
    hooks?.onLink && (() => hooks.onLink!(plan.userId, plan.sub)),
  );
}

/** 푼다 — 그 사람의 세션(refresh 행)도 지운다. 새 sub 로 다시 이을 때까지 SSO 로 못 들어온다 */
export async function applyUnlink(
  prisma: PrismaClient,
  plan: Extract<UnlinkPlan, { action: 'unlink' }>,
  hooks?: OidcUserHooks,
): Promise<void> {
  const count = await prisma.$transaction(async (tx) => {
    // 로그인과 줄을 선다 — SSO 로그인은 잠금 아래에서 sub 가 아직 이어져 있는지 보므로, 풀고 지운 뒤에 새 세션이 남지 않는다
    await LockUsersCommand(tx, [plan.userId]);
    const updated = await tx.user.updateMany({
      where: { id: plan.userId, ssoSubject: plan.sub },
      data: { ssoSubject: null },
    });
    if (updated.count === 1) {
      await tx.refreshToken.deleteMany({ where: { userId: plan.userId } });
    }
    return updated.count;
  });
  if (count !== 1) {
    throw new Error('행이 그사이 바뀌었습니다 — 미리보기부터 다시 하세요');
  }
  logger.log(`SSO unlinked: userId=${plan.userId} sub=${plan.sub}`);
  await callHook(
    'onUnlink',
    hooks?.onUnlink && (() => hooks.onUnlink!(plan.userId, plan.sub)),
  );
}
