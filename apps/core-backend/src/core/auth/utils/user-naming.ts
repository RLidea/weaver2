import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@weaver2/prisma';
import { isReservedDisplayName } from '@weaver2/common/utility/reserved-names.util';

/**
 * 바깥 신원(OAuth · SSO)으로 처음 오는 사람의 username · displayName(둘 다 @unique).
 * 비밀번호 가입은 사람이 고르지만, 바깥 신원은 받은 값을 다듬어 겹치지 않게 만든다.
 */

const DISPLAY_NAME_MAX = 30;
const DISPLAY_NAME_TRIES = 5;

type Db = Pick<PrismaClient, 'user'>;

/**
 * 받은 이름을 displayName 으로 쓸 수 있게 다듬는다.
 * 겹치면 숫자를 붙인다 — 그대로 넣으면 흔한 이름의 첫 로그인이 P2002 로 실패하고,
 * Apple 은 이름을 첫 승인 때 한 번만 주므로 그 실패는 되돌릴 수 없다.
 */
export async function generateUniqueDisplayName(
  prisma: Db,
  raw: string,
): Promise<string> {
  const cleaned = raw
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, DISPLAY_NAME_MAX);
  const base = cleaned && !isReservedDisplayName(cleaned) ? cleaned : 'user';

  for (let n = 1; n <= DISPLAY_NAME_TRIES; n++) {
    const candidate = n === 1 ? base : `${base}${n}`;
    const taken = await prisma.user.findFirst({
      where: { displayName: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}_${randomUUID().replace(/-/g, '').slice(0, 6)}`;
}

/** `${prefix}_${id 앞 8자}` — 겹치면 무작위 6자 */
export async function generateUniqueUsername(
  prisma: Db,
  prefix: string,
  id: string,
): Promise<string> {
  const base = `${prefix}_${id.slice(0, 8)}`;
  const existing = await prisma.user.findFirst({
    where: { username: base },
  });
  if (!existing) return base;

  const suffix = randomUUID().replace(/-/g, '').slice(0, 6);
  const candidate = `${prefix}_${suffix}`;
  const conflict = await prisma.user.findFirst({
    where: { username: candidate },
  });
  if (conflict) {
    throw new BadRequestException(
      'Username generation failed. Please try again.',
    );
  }
  return candidate;
}
