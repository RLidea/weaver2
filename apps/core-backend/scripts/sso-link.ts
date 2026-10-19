/**
 * 운영자 손 — 이미 있는 행을 바깥 계정 서버의 신원(sub)에 잇고 푼다.
 *
 *   pnpm sso:link   --email <주소> --sub <계정 서버 users.id> [--apply]
 *   pnpm sso:unlink --email <주소> [--apply]
 *
 * 기본은 미리보기다. `--apply` 일 때만 쓴다. 몇 번 돌려도 같다(이미 이어졌으면 아무것도 안 함).
 * 잇기 전에 계정 서버에서 그 sub 의 이메일 · 인증 여부를 **사람이 대조한다** — 이 스크립트는
 * 계정 서버를 보지 못한다. 규칙은 `src/core/auth/oidc/sso-link.ts`.
 *
 * 앱 모듈을 띄워 파생 프로젝트의 `OIDC_USER_HOOKS`(onLink · onUnlink — 인증 사건 기록)까지
 * 부른다. 운영 서버에서는 그 서버의 `.env`(운영 DB) 로 돈다 — 로컬에 운영 DB 비밀을 두지 않는다.
 */
import { NestFactory } from '@nestjs/core';
import { PrismaService } from '@weaver2/prisma';
import { CoreModule } from '../src/core.module';
import {
  OIDC_USER_HOOKS,
  OidcUserHooks,
} from '../src/core/auth/oidc/oidc-user-hooks';
import {
  applyLink,
  applyUnlink,
  findLinkRows,
  planLink,
  planUnlink,
} from '../src/core/auth/oidc/sso-link';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const command = process.argv[2];
  const email = arg('email');
  const sub = arg('sub');
  const apply = process.argv.includes('--apply');
  if (
    !email ||
    (command === 'link' && !sub) ||
    (command !== 'link' && command !== 'unlink')
  ) {
    console.error(
      '사용법: pnpm sso:link --email <주소> --sub <sub> [--apply] · pnpm sso:unlink --email <주소> [--apply]',
    );
    process.exit(2);
  }

  const app = await NestFactory.createApplicationContext(CoreModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const prisma = app.get(PrismaService);
    let hooks: OidcUserHooks | undefined;
    try {
      hooks = app.get<OidcUserHooks>(OIDC_USER_HOOKS, { strict: false });
    } catch {
      // 파생 프로젝트가 훅을 내주지 않았다
    }

    const rows = await findLinkRows(prisma, email, sub);
    if (command === 'link') {
      const plan = planLink(rows, email, sub!);
      console.log(JSON.stringify(plan));
      if (plan.action === 'stop') process.exitCode = 1;
      else if (plan.action === 'already-linked')
        console.log('이미 이어져 있습니다');
      else if (!apply) console.log('미리보기 — 쓰려면 --apply');
      else {
        await applyLink(prisma, plan, hooks);
        console.log('이었습니다');
      }
    } else {
      const plan = planUnlink(rows, email);
      console.log(JSON.stringify(plan));
      if (plan.action === 'stop') process.exitCode = 1;
      else if (plan.action === 'already-unlinked')
        console.log('이어져 있지 않습니다');
      else if (!apply) console.log('미리보기 — 쓰려면 --apply');
      else {
        await applyUnlink(prisma, plan, hooks);
        console.log('풀었습니다 — 그 사람의 세션도 지웠습니다');
      }
    }
  } finally {
    await app.close();
  }
}

main().catch((err: unknown) => {
  console.error((err as Error).message);
  process.exit(1);
});
