import { createHmac, hkdfSync, randomInt } from 'crypto';

/**
 * 6자리 코드 해시의 키. 새 환경 변수를 만들지 않고 JWT_SECRET 에서 용도별로 파생한다 —
 * 하류마다 부팅을 막는 필수 값이 늘지 않고, 같은 비밀이 다른 용도의 키로 새지 않는다.
 * JWT_SECRET 을 바꾸면 살아 있던 코드(최대 10분)만 무효가 된다.
 */
export function deriveCodeKey(jwtSecret: string): Buffer {
  return Buffer.from(
    hkdfSync('sha256', jwtSecret, '', 'weaver2/one-time-code/v1', 32),
  );
}

/**
 * 6자리 코드의 저장용 해시. 100만 후보라 키 없는 해시(bcrypt 포함)는 DB 가 새면 다 돌 수
 * 있다 — 키를 건 HMAC 은 DB 만으로 못 푼다. 결정적이라 비교와 소비를 한 문장으로 할 수 있다.
 * 구분자(0x00)가 있어 이어 붙인 값끼리 부딪히지 않는다.
 */
export function hashCode(
  key: Buffer,
  purpose: string,
  userId: string,
  code: string,
): string {
  return createHmac('sha256', key)
    .update(`${purpose}\0${userId}\0${code}`)
    .digest('hex');
}

/** 000000~999999 를 고르게. */
export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}
