import { Transform } from 'class-transformer';

/**
 * 이메일은 늘 소문자로 저장하고 정확 일치로 비교한다.
 *
 * `Victim@x.com` 과 `victim@x.com` 이 다른 계정이 되면 가입 충돌(409)을 피해 같은 사람의
 * 이메일을 선점할 수 있다. Prisma 의 `mode: 'insensitive'` 는 `ILIKE` 로 바뀌어 입력의
 * `%`·`_` 가 와일드카드가 되고 인덱스도 못 타므로 쓰지 않는다 — 들어오는 입구에서 소문자로
 * 바꾸고, DB 는 `CHECK (email = lower(email))` 로 지킨다.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** DTO 의 이메일 칸을 검증 전에 소문자로 바꾼다 (문자열이 아니면 그대로 두어 검증이 거절하게) */
export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  );
}
