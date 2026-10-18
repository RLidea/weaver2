import { diffLines } from 'diff';

export interface DiffLine {
  kind: 'added' | 'removed' | 'unchanged';
  text: string;
  /** 옛 글에서의 줄 번호 (더한 줄이면 null) */
  oldNumber: number | null;
  /** 새 글에서의 줄 번호 (뺀 줄이면 null) */
  newNumber: number | null;
}

/** 줄바꿈을 LF 로 맞추고 끝 줄바꿈 하나를 뗀다 — 그것만 다른 두 글이 같게 보이도록 */
function normalize(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\n$/, '');
}

/** 두 글을 줄 단위로 비교해 한 줄씩 늘어놓는다. 비교 자체는 jsdiff 가 한다 */
export function diffByLine(before: string, after: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let oldNumber = 1;
  let newNumber = 1;

  for (const change of diffLines(normalize(before), normalize(after))) {
    if (change.value === '') continue;
    const kind = change.added ? 'added' : change.removed ? 'removed' : 'unchanged';
    for (const text of change.value.replace(/\n$/, '').split('\n')) {
      lines.push({
        kind,
        text,
        oldNumber: kind === 'added' ? null : oldNumber++,
        newNumber: kind === 'removed' ? null : newNumber++,
      });
    }
  }
  return lines;
}
