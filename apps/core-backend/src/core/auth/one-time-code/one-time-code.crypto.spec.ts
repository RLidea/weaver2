import { deriveCodeKey, generateCode, hashCode } from './one-time-code.crypto';

describe('one-time-code.crypto', () => {
  const key = deriveCodeKey('jwt-secret');

  it('코드는 늘 6자리 숫자다 — 앞자리 0 도 채운다', () => {
    for (let i = 0; i < 2000; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });

  it('같은 입력이면 같은 해시 — 비교와 소비를 한 문장으로 할 수 있다', () => {
    expect(hashCode(key, 'STEP_UP', 'u1', '012345')).toBe(
      hashCode(key, 'STEP_UP', 'u1', '012345'),
    );
  });

  it('목적·사용자·키가 다르면 다른 해시 — 다른 자리의 코드로 쓸 수 없다', () => {
    const base = hashCode(key, 'STEP_UP', 'u1', '012345');
    expect(hashCode(key, 'EMAIL_CHANGE', 'u1', '012345')).not.toBe(base);
    expect(hashCode(key, 'STEP_UP', 'u2', '012345')).not.toBe(base);
    expect(
      hashCode(deriveCodeKey('other'), 'STEP_UP', 'u1', '012345'),
    ).not.toBe(base);
  });

  it('구분자가 있어 이어 붙인 값끼리 부딪히지 않는다', () => {
    expect(hashCode(key, 'A', 'B1', '2')).not.toBe(
      hashCode(key, 'A', 'B', '12'),
    );
  });

  it('키는 JWT_SECRET 그 자체가 아니다 — 용도별로 파생한다', () => {
    expect(key.equals(Buffer.from('jwt-secret'))).toBe(false);
    expect(key).toHaveLength(32);
  });
});
