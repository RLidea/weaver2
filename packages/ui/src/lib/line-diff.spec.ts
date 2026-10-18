import { diffByLine } from './line-diff';

describe('diffByLine', () => {
  it('같으면 모두 unchanged 이고 줄 번호가 양쪽에 붙는다', () => {
    expect(diffByLine('가\n나', '가\n나')).toEqual([
      { kind: 'unchanged', text: '가', oldNumber: 1, newNumber: 1 },
      { kind: 'unchanged', text: '나', oldNumber: 2, newNumber: 2 },
    ]);
  });

  it('가운데 한 줄을 바꾸면 removed 다음 added, 뒤 줄 번호가 어긋나지 않는다', () => {
    expect(diffByLine('가\n나\n다', '가\n나나\n다')).toEqual([
      { kind: 'unchanged', text: '가', oldNumber: 1, newNumber: 1 },
      { kind: 'removed', text: '나', oldNumber: 2, newNumber: null },
      { kind: 'added', text: '나나', oldNumber: null, newNumber: 2 },
      { kind: 'unchanged', text: '다', oldNumber: 3, newNumber: 3 },
    ]);
  });

  it('줄을 더하면 그 뒤의 새 줄 번호만 밀린다', () => {
    expect(diffByLine('가\n다', '가\n나\n다')).toEqual([
      { kind: 'unchanged', text: '가', oldNumber: 1, newNumber: 1 },
      { kind: 'added', text: '나', oldNumber: null, newNumber: 2 },
      { kind: 'unchanged', text: '다', oldNumber: 2, newNumber: 3 },
    ]);
  });

  /** 편집기마다 끝 줄바꿈을 붙이기도 안 붙이기도 한다 — 그것만으로 마지막 줄이 바뀐 것으로 보이면 안 된다 */
  it('끝 줄바꿈 유무만 다르면 바뀐 줄이 없다', () => {
    expect(diffByLine('가\n나', '가\n나\n').map((line) => line.kind)).toEqual([
      'unchanged',
      'unchanged',
    ]);
  });

  it('CRLF 와 LF 는 같은 줄로 본다', () => {
    expect(diffByLine('가\r\n나', '가\n나').map((line) => line.kind)).toEqual([
      'unchanged',
      'unchanged',
    ]);
  });

  it('빈 줄도 한 줄로 센다', () => {
    expect(diffByLine('가\n\n나', '가\n나')).toEqual([
      { kind: 'unchanged', text: '가', oldNumber: 1, newNumber: 1 },
      { kind: 'removed', text: '', oldNumber: 2, newNumber: null },
      { kind: 'unchanged', text: '나', oldNumber: 3, newNumber: 2 },
    ]);
  });

  it('빈 글에서 여러 줄로', () => {
    expect(diffByLine('', '가\n나')).toEqual([
      { kind: 'added', text: '가', oldNumber: null, newNumber: 1 },
      { kind: 'added', text: '나', oldNumber: null, newNumber: 2 },
    ]);
  });

  it('둘 다 비면 줄이 없다', () => {
    expect(diffByLine('', '')).toEqual([]);
  });
});
