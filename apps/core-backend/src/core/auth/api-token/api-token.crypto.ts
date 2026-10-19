import { randomBytes, timingSafeEqual } from 'crypto';
import { hashToken } from '../utils/auth-crypto.util';

/**
 * 원문 모양: `wvt_<12 hex>_<64 hex>`. 앞의 `wvt_<12 hex>` 가 prefix(조회 열쇠 · 이름표)다.
 *
 * `wvt_` 표지가 있어 가드가 JWT(점으로 나뉜 세 덩어리)와 한 줄 정규식으로 가른다.
 * 뒤의 64 hex(256비트)가 비밀이라 키 없는 sha256 으로 저장해도 거꾸로 못 푼다 —
 * refresh 토큰과 같은 `hashToken` 을 쓴다.
 */
const API_TOKEN_PATTERN = /^(wvt_[0-9a-f]{12})_[0-9a-f]{64}$/;
const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

export interface GeneratedApiToken {
  raw: string;
  prefix: string;
  tokenHash: string;
}

export function generateApiToken(): GeneratedApiToken {
  const prefix = `wvt_${randomBytes(6).toString('hex')}`;
  const raw = `${prefix}_${randomBytes(32).toString('hex')}`;
  return { raw, prefix, tokenHash: hashToken(raw) };
}

/** `Authorization` 헤더가 API 토큰이면 원문과 prefix 를, 아니면(없음 · JWT · 어긋난 모양) null */
export function parseApiToken(
  authorization: string | undefined,
): { raw: string; prefix: string } | null {
  const raw = BEARER_PATTERN.exec(authorization ?? '')?.[1];
  if (!raw) return null;
  const prefix = API_TOKEN_PATTERN.exec(raw)?.[1];
  return prefix ? { raw, prefix } : null;
}

/** 원문의 sha256 이 저장된 해시와 같은가 — 걸린 시간으로 몇 글자가 맞았는지 새지 않게 비교한다 */
export function matchesTokenHash(raw: string, storedHash: string): boolean {
  const presented = Buffer.from(hashToken(raw), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return (
    presented.length === stored.length && timingSafeEqual(presented, stored)
  );
}
