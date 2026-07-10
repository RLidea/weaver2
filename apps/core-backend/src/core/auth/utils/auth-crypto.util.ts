import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';

/**
 * 인증 토큰·시크릿 보호 유틸.
 *
 * - 토큰(refresh / reset / verification): 고엔트로피 랜덤이라 SHA-256 단방향 해시로 충분.
 *   결정적 해시이므로 DB unique 인덱스 + findUnique 조회를 그대로 유지한다.
 * - TOTP secret: 검증 시 원문이 필요하므로 해시 불가 → AES-256-GCM 대칭 암호화.
 *   저장 포맷은 `v1:iv:tag:ciphertext`(hex). 버전 프리픽스로 향후 키 로테이션 여지를 남긴다.
 */

const ENC_VERSION = 'v1';
const ENC_KEY_ENV = 'TOTP_ENCRYPTION_KEY';

/** 고엔트로피 토큰의 저장용 SHA-256 해시(hex). 조회/삭제 전 원문을 이 값으로 변환한다. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** env 키를 AES-256용 32바이트로 유도(어떤 길이의 키 문자열도 허용). 미설정 시 fail-fast. */
function deriveKey(): Buffer {
  const raw = process.env[ENC_KEY_ENV];
  if (!raw) {
    throw new Error(
      `${ENC_KEY_ENV} is not set — required to encrypt/decrypt TOTP secrets.`,
    );
  }
  return createHash('sha256').update(raw).digest();
}

/** 암호문이 이 유틸이 만든 v1 포맷인지 여부(legacy 평문 판별용). */
export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(`${ENC_VERSION}:`);
}

/** TOTP secret 암호화 → `v1:iv:tag:ciphertext`(hex). */
export function encryptSecret(plain: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${ENC_VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * 저장된 secret을 원문으로 복원.
 * - `v1:` 포맷이면 복호화.
 * - 프리픽스가 없으면 배포 전 저장된 legacy 평문으로 간주하고 그대로 반환한다.
 *   (호출부에서 이 경우를 감지해 재암호화하는 lazy migration을 수행할 수 있다 → `isEncryptedSecret`)
 */
export function decryptSecret(stored: string): string {
  if (!isEncryptedSecret(stored)) {
    return stored; // legacy 평문
  }
  const [, ivHex, tagHex, ctHex] = stored.split(':');
  const key = deriveKey();
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ctHex, 'hex')),
    decipher.final(),
  ]);
  return plain.toString('utf8');
}
