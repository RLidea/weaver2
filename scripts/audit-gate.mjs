#!/usr/bin/env node
/**
 * 의존성 감사를 재고, 정해진 눈금을 넘으면 종료 코드 1 을 낸다.
 *
 * 왜 `pnpm audit --audit-level=` 을 안 쓰고 이걸 쓰는가:
 *
 * 1. `--json` 의 `metadata.vulnerabilities` 는 **auditConfig.ignoreGhsas 로 넘긴 것까지 센다.**
 *    2026-09-15 실측: metadata 는 high 2 를 말하는데 `advisories` 에는 high 가 없다.
 *    그 둘은 우리가 「고칠 판이 아직 없다」고 드러내 놓고 넘긴 image-size 다.
 *    metadata 를 믿으면 관문이 영영 빨갛고, 빨간 관문은 아무도 안 본다.
 *    그래서 `advisories` 를 센다 — 넘긴 것은 여기서 자연히 빠진다.
 *
 * 2. 프로덕션 경로와 dev 도구를 갈라 세야 한다. 같은 high 라도 서버에서 도는 것과
 *    빌드 때만 도는 것은 무게가 다르다.
 *
 * 3. 관문(막는 것)과 경보(알리는 것)의 눈금이 달라야 한다. CI 가 두 번 재는 대신
 *    한 번 재고 두 눈금으로 읽는다.
 *
 * 쓰는 법:
 *   node scripts/audit-gate.mjs                     # high 이상이면 실패
 *   node scripts/audit-gate.mjs --level=moderate    # moderate 이상이면 실패
 *   node scripts/audit-gate.mjs --level=none        # 재고 보여주기만 한다
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, appendFileSync } from 'node:fs';

const RANK = ['critical', 'high', 'moderate', 'low', 'info'];

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const level = opt('level', 'high');
const outPath = opt('json', 'audit-report.json');

if (level !== 'none' && !RANK.includes(level)) {
  console.error(`알 수 없는 눈금: ${level} (쓸 수 있는 값: ${RANK.join(' · ')} · none)`);
  process.exit(2);
}

// pnpm audit 은 취약점을 찾으면 종료 코드 1 을 낸다 — 그건 실패가 아니라 결과다.
// 그러나 JSON 이 아예 안 나오는 것(네트워크·인증 실패)은 진짜 실패다.
// 조용히 초록이 되면 「검사하고 있다」는 거짓말이 된다.
let raw;
try {
  raw = execFileSync('pnpm', ['audit', '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (err) {
  raw = err.stdout ?? '';
  if (!raw.trim()) {
    console.error('감사를 돌리지 못했습니다 — pnpm audit 이 아무것도 내놓지 않았습니다.');
    console.error(String(err.stderr ?? err.message).trim().slice(0, 2000));
    process.exit(2);
  }
}

let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error('감사 결과를 읽지 못했습니다 — JSON 이 아닙니다.');
  console.error(raw.slice(0, 2000));
  process.exit(2);
}

writeFileSync(outPath, raw);

const advisories = Object.values(report.advisories ?? {});
const counted = { critical: [0, 0], high: [0, 0], moderate: [0, 0], low: [0, 0], info: [0, 0] };
const over = [];

for (const a of advisories) {
  const findings = a.findings ?? [];
  // 경로가 하나라도 프로덕션이면 프로덕션으로 센다 — 무겁게 읽는 쪽으로.
  const isProd = findings.some((f) => !f.dev);
  const row = counted[a.severity];
  if (!row) continue;
  row[isProd ? 0 : 1] += 1;
  if (level !== 'none' && RANK.indexOf(a.severity) <= RANK.indexOf(level)) {
    over.push({ ...a, isProd });
  }
}

const ignoredByLevel = {};
for (const sev of RANK) {
  const fromMeta = report.metadata?.vulnerabilities?.[sev] ?? 0;
  const seen = counted[sev][0] + counted[sev][1];
  if (fromMeta > seen) ignoredByLevel[sev] = fromMeta - seen;
}

const lines = [];
const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

lines.push(`의존성 감사 — ${new Date().toISOString().slice(0, 10)}`);
lines.push('');
lines.push(`  ${pad('', 10)}${lpad('프로덕션', 10)}${lpad('dev 도구', 10)}${lpad('합계', 8)}`);
for (const sev of RANK) {
  const [prod, dev] = counted[sev];
  if (prod + dev === 0 && sev === 'info') continue;
  lines.push(`  ${pad(sev, 10)}${lpad(prod, 10)}${lpad(dev, 10)}${lpad(prod + dev, 8)}`);
}
lines.push('');

const ignoredText = Object.entries(ignoredByLevel)
  .map(([sev, n]) => `${sev} ${n}`)
  .join(' · ');
if (ignoredText) {
  lines.push(`  드러내 놓고 넘긴 것 (pnpm-workspace.yaml 의 auditConfig.ignoreGhsas): ${ignoredText}`);
  lines.push('  └ 고친 판이 아직 없는 것들입니다. 지울 신호는 그 파일 주석에 적혀 있습니다.');
  lines.push('');
}

lines.push(`  이 관문의 눈금: ${level === 'none' ? '없음 (재고 보여주기만 합니다)' : `${level} 이상`}`);

if (over.length > 0) {
  lines.push('');
  lines.push(`  눈금을 넘은 것 ${over.length}건:`);
  for (const a of over) {
    lines.push(`   · [${a.severity}]${a.isProd ? '(프로덕션)' : '(dev)'} ${a.module_name} → 패치 ${a.patched_versions ?? '없음'}`);
    lines.push(`     ${a.title}`);
    lines.push(`     ${a.url}`);
  }
}

const text = lines.join('\n');
console.log(text);

if (process.env.GITHUB_STEP_SUMMARY) {
  // 이슈 생성이 또 막혀도 run 화면에서는 보이도록. 2026-09-15 에 7주치 경보가
  // 403 으로 조용히 버려진 적이 있다 — 그때 이 요약이 있었으면 바로 보였다.
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## 의존성 감사\n\n\`\`\`\n${text}\n\`\`\`\n`);
}

process.exit(over.length > 0 ? 1 : 0);
