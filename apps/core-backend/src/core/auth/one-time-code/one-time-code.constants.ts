import { OneTimeCodePurpose } from '@weaver2/prisma';

/** 6자리 코드 하나에 허락하는 확인 시도. 다 쓰면 만료될 때까지 새로 받을 수도 없다. */
export const MAX_CODE_ATTEMPTS = 5;

/** 메일 링크(256비트 토큰)로 오가는 목적. 나머지는 6자리 코드다. */
export type LinkPurpose = Extract<
  OneTimeCodePurpose,
  'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
>;
export type CodePurpose = Exclude<OneTimeCodePurpose, LinkPurpose>;

export const LINK_TTL_MS = 60 * 60 * 1000;
export const LINK_COOLDOWN_MS = 10 * 60 * 1000;
export const CODE_TTL_MS = 10 * 60 * 1000;
export const CODE_COOLDOWN_MS = 60 * 1000;
