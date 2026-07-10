import {
  hashToken,
  encryptSecret,
  decryptSecret,
  isEncryptedSecret,
} from './auth-crypto.util';

describe('auth-crypto.util', () => {
  describe('hashToken', () => {
    it('같은 입력은 같은 해시(결정적) — 조회에 쓸 수 있어야 함', () => {
      expect(hashToken('abc')).toBe(hashToken('abc'));
    });

    it('다른 입력은 다른 해시, 원문과 다름(64자 hex)', () => {
      const h = hashToken('token-value');
      expect(h).not.toBe('token-value');
      expect(h).toMatch(/^[0-9a-f]{64}$/);
      expect(hashToken('other')).not.toBe(h);
    });
  });

  describe('encryptSecret / decryptSecret', () => {
    const KEY = 'test-encryption-key-please-change';
    let prevKey: string | undefined;

    beforeAll(() => {
      prevKey = process.env.TOTP_ENCRYPTION_KEY;
      process.env.TOTP_ENCRYPTION_KEY = KEY;
    });

    afterAll(() => {
      process.env.TOTP_ENCRYPTION_KEY = prevKey;
    });

    it('암호화 → 복호화 라운드트립이 원문을 복원한다', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const enc = encryptSecret(secret);
      expect(enc).not.toBe(secret);
      expect(isEncryptedSecret(enc)).toBe(true);
      expect(enc.startsWith('v1:')).toBe(true);
      expect(decryptSecret(enc)).toBe(secret);
    });

    it('같은 값도 매번 다른 암호문(랜덤 IV)이지만 둘 다 복호화된다', () => {
      const a = encryptSecret('same');
      const b = encryptSecret('same');
      expect(a).not.toBe(b);
      expect(decryptSecret(a)).toBe('same');
      expect(decryptSecret(b)).toBe('same');
    });

    it('legacy 평문(v1: 프리픽스 없음)은 그대로 반환 — 하위호환', () => {
      const legacyPlain = 'PLAINTEXTSECRET';
      expect(isEncryptedSecret(legacyPlain)).toBe(false);
      expect(decryptSecret(legacyPlain)).toBe(legacyPlain);
    });

    it('키 미설정 시 암호화는 fail-fast', () => {
      delete process.env.TOTP_ENCRYPTION_KEY;
      expect(() => encryptSecret('x')).toThrow();
      process.env.TOTP_ENCRYPTION_KEY = KEY;
    });
  });
});
