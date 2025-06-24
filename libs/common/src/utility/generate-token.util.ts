import { randomBytes } from 'crypto';

export function generateTokenUtil(): string {
  return randomBytes(32).toString('hex'); // 64자리 토큰
}
