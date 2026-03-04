import {
  RESERVED_DISPLAY_NAME_KEYWORDS,
  RESERVED_USERNAMES,
} from '../constants/reserved-names.const';

/** username이 예약어인지 확인 (대소문자 무시, 정확 일치) */
export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}

/** displayName에 금지 키워드가 포함되는지 확인 (공백·특수문자 제거 후 검사) */
export function isReservedDisplayName(displayName: string): boolean {
  const normalized = displayName.toLowerCase().replace(/[\s\-_.·•]/g, '');
  return RESERVED_DISPLAY_NAME_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
}
