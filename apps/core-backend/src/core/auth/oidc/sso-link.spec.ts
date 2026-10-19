import { LinkRow, planLink, planUnlink } from './sso-link';

const SUB = '3f2b8c1e-9d4a-4e7b-8a6c-1b2d3e4f5a6b';
const OTHER_SUB = '00000000-1111-4222-8333-444444444444';

function row(over: Partial<LinkRow> = {}): LinkRow {
  return {
    id: 'u1',
    email: 'owner@example.com',
    ssoSubject: null,
    deletedAt: null,
    ...over,
  };
}

describe('planLink', () => {
  it('정상 → link (이메일은 정규화해서 비교한다)', () => {
    expect(planLink([row()], ' Owner@Example.com ', SUB)).toEqual({
      action: 'link',
      userId: 'u1',
      sub: SUB,
    });
  });

  it('행 없음 → 멈춤', () => {
    expect(planLink([], 'owner@example.com', SUB).action).toBe('stop');
  });

  it('같은 이메일의 행이 둘 → 멈춤', () => {
    expect(
      planLink([row(), row({ id: 'u2' })], 'owner@example.com', SUB).action,
    ).toBe('stop');
  });

  it('탈퇴 행 → 멈춤', () => {
    expect(
      planLink([row({ deletedAt: new Date() })], 'owner@example.com', SUB)
        .action,
    ).toBe('stop');
  });

  it('이미 같은 sub → 이미 이어짐 (멱등)', () => {
    expect(
      planLink([row({ ssoSubject: SUB })], 'owner@example.com', SUB),
    ).toEqual({ action: 'already-linked', userId: 'u1', sub: SUB });
  });

  it('다른 sub 에 이어져 있음 → 멈춤 (먼저 unlink)', () => {
    const plan = planLink(
      [row({ ssoSubject: OTHER_SUB })],
      'owner@example.com',
      SUB,
    );
    expect(plan).toMatchObject({ action: 'stop' });
    expect(plan.action === 'stop' && plan.reason).toContain('sso:unlink');
  });

  it('다른 행이 그 sub 를 쥠 → 멈춤', () => {
    expect(
      planLink(
        [row(), row({ id: 'u2', email: 'x@example.com', ssoSubject: SUB })],
        'owner@example.com',
        SUB,
      ).action,
    ).toBe('stop');
  });

  it('sub 가 uuid 모양이 아님 → 멈춤', () => {
    expect(planLink([row()], 'owner@example.com', 'not-a-uuid').action).toBe(
      'stop',
    );
  });
});

describe('planUnlink', () => {
  it('이어진 행 → unlink', () => {
    expect(planUnlink([row({ ssoSubject: SUB })], 'owner@example.com')).toEqual(
      { action: 'unlink', userId: 'u1', sub: SUB },
    );
  });

  it('이어지지 않은 행 → 이미 풀림 (멱등)', () => {
    expect(planUnlink([row()], 'owner@example.com')).toEqual({
      action: 'already-unlinked',
      userId: 'u1',
    });
  });

  it('행 없음 · 탈퇴 행 → 멈춤', () => {
    expect(planUnlink([], 'owner@example.com').action).toBe('stop');
    expect(
      planUnlink(
        [row({ ssoSubject: SUB, deletedAt: new Date() })],
        'owner@example.com',
      ).action,
    ).toBe('stop');
  });
});
