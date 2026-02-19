import { encodeCursor, decodeCursor } from './cursor.utils';

describe('cursor.utils', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('should round-trip a simple payload', () => {
      const payload = { id: 'uuid-123', createdAt: '2024-01-15T09:00:00.000Z' };
      const encoded = encodeCursor(payload);
      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(payload);
    });

    it('should produce a URL-safe string (no +, /, =)', () => {
      const encoded = encodeCursor({ id: 'test', value: 12345 });
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('should round-trip a numeric value', () => {
      const payload = { id: 'abc', viewCount: 42 };
      expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
    });

    it('should throw on invalid cursor string', () => {
      expect(() => decodeCursor('!!invalid!!')).toThrow('Invalid cursor format');
    });

    it('should throw on valid base64 but invalid JSON', () => {
      const garbage = Buffer.from('not-json').toString('base64url');
      expect(() => decodeCursor(garbage)).toThrow('Invalid cursor format');
    });
  });
});
