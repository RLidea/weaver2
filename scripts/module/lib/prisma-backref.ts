/**
 * prisma-backref.ts
 *
 * auth.prisma의 User 모델에 banner backref 라인을 추가/제거한다.
 *
 * .prisma는 ts-morph 불가 → 정규식/문자열 처리.
 *
 * 실제 파일 구조 (auth.prisma):
 *
 *   model User {
 *     ...
 *     // Project-specific relations (board)
 *     posts     Post[]
 *     comments  Comment[]
 *     reactions PostReaction[]
 *     files     PostFile[]
 *
 *     // Project-specific relations (banner)
 *     banners   Banner[]
 *
 *     // Project-specific relations (abuse report)
 *     ...
 *   }
 *
 * addBackref: 이미 있으면 skip (멱등)
 * removeBackref: 해당 섹션(주석 + field 라인 + 빈 줄)을 제거
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BANNER_RECIPE as R } from './banner-recipe';

/** 실제 파일에서 확인한 backref 섹션 (주석 포함) */
const BACKREF_SECTION = `\n  // Project-specific relations (banner)\n  banners   Banner[]\n`;

export function addBackref(root: string): void {
  const file = path.join(root, R.coreBackref.file);
  let txt = fs.readFileSync(file, 'utf8');

  // 멱등: 이미 존재하면 skip
  if (txt.includes(R.coreBackref.field)) return;

  // board 섹션 뒤, abuse-report 섹션 앞에 삽입
  // 삽입 앵커: board 섹션 끝 (files PostFile[] 뒤)
  const anchor = `  files     PostFile[]\n`;
  if (txt.includes(anchor)) {
    txt = txt.replace(anchor, `${anchor}${BACKREF_SECTION}`);
  } else {
    // fallback: User 모델 블록의 마지막 필드 뒤 (닫는 `}` 직전)
    txt = txt.replace(
      /(model User \{[\s\S]*?)(\n\})/,
      `$1${BACKREF_SECTION}$2`,
    );
  }

  fs.writeFileSync(file, txt);
  console.log(`  + auth.prisma: User.banners Banner[] 추가`);
}

export function removeBackref(root: string): void {
  const file = path.join(root, R.coreBackref.file);
  let txt = fs.readFileSync(file, 'utf8');

  // 없으면 skip (멱등)
  if (!txt.includes(R.coreBackref.field)) return;

  // 주석 + field 라인 + 빈 줄 전체 제거
  txt = txt.replace(BACKREF_SECTION, '');

  fs.writeFileSync(file, txt);
  console.log(`  - auth.prisma: User.banners Banner[] 제거`);
}
