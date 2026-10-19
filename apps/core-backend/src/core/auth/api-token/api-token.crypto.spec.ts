// 진짜 비교를 그대로 하되, 불렸는지 셀 수 있게 감싼다
jest.mock('crypto', () => {
  const actual = jest.requireActual<typeof import('crypto')>('crypto');
  return { ...actual, timingSafeEqual: jest.fn(actual.timingSafeEqual) };
});

import { createHash, timingSafeEqual } from 'crypto';
import {
  generateApiToken,
  matchesTokenHash,
  parseApiToken,
} from './api-token.crypto';

describe('api-token.crypto', () => {
  it('원문은 `wvt_<12hex>_<64hex>` 이고 prefix 는 그 앞부분이다', () => {
    const { raw, prefix, tokenHash } = generateApiToken();
    expect(raw).toMatch(/^wvt_[0-9a-f]{12}_[0-9a-f]{64}$/);
    expect(raw.startsWith(`${prefix}_`)).toBe(true);
    expect(prefix).toMatch(/^wvt_[0-9a-f]{12}$/);
    expect(tokenHash).toBe(createHash('sha256').update(raw).digest('hex'));
  });

  it('매번 다르다', () => {
    const a = generateApiToken();
    const b = generateApiToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.prefix).not.toBe(b.prefix);
  });

  describe('parseApiToken', () => {
    it('Bearer 헤더의 원문을 prefix 와 함께 꺼낸다', () => {
      const { raw, prefix } = generateApiToken();
      expect(parseApiToken(`Bearer ${raw}`)).toEqual({ raw, prefix });
      expect(parseApiToken(`bearer   ${raw}`)).toEqual({ raw, prefix });
    });

    it.each([
      ['헤더 없음', undefined],
      ['빈 값', ''],
      ['Bearer 아님', `Basic ${generateApiToken().raw}`],
      ['JWT', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1In0.c2ln'],
      ['짧은 random', 'Bearer wvt_0123456789ab_abcd'],
      ['대문자 hex', `Bearer ${generateApiToken().raw.toUpperCase()}`],
      ['뒤에 군더더기', `Bearer ${generateApiToken().raw}x`],
    ])('%s 이면 null', (_, header) => {
      expect(parseApiToken(header)).toBeNull();
    });
  });

  describe('matchesTokenHash', () => {
    it('원문의 sha256 과 같으면 true, 아니면 false', () => {
      const { raw, tokenHash } = generateApiToken();
      expect(matchesTokenHash(raw, tokenHash)).toBe(true);
      const lastFlipped = raw.slice(0, -1) + (raw.endsWith('0') ? '1' : '0');
      expect(matchesTokenHash(lastFlipped, tokenHash)).toBe(false);
      expect(matchesTokenHash(generateApiToken().raw, tokenHash)).toBe(false);
    });

    it('crypto.timingSafeEqual 로 비교한다 — 일찍 끝나는 문자열 비교(===)가 아니다', () => {
      const spy = jest.mocked(timingSafeEqual);
      spy.mockClear();
      const { raw, tokenHash } = generateApiToken();
      expect(matchesTokenHash(raw, tokenHash)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('저장된 해시의 길이가 어긋나도 던지지 않고 false', () => {
      const { raw } = generateApiToken();
      expect(matchesTokenHash(raw, 'abcd')).toBe(false);
    });
  });
});
