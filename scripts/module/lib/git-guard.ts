import { execSync } from 'node:child_process';

/** 워킹트리가 더러우면 throw. 실수로 미커밋 변경 위에 덮어쓰는 것 방지. */
export function assertCleanWorktree(): void {
  const out = execSync('git status --porcelain', { encoding: 'utf8', cwd: process.cwd() }).trim();
  if (out) {
    throw new Error(
      '워킹트리에 커밋되지 않은 변경이 있습니다. 커밋/스태시 후 다시 실행하세요.\n' + out,
    );
  }
}
