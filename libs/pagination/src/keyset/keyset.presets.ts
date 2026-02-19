export interface KeysetFieldDef {
  field: string;
  direction: 'asc' | 'desc';
  type: 'string' | 'number' | 'date';
}

export interface KeysetPreset {
  name: string;
  fields: KeysetFieldDef[];
}

/**
 * 사전 정의된 keyset 페이지네이션 preset.
 * 마지막 필드는 반드시 unique한 tiebreaker여야 함 (id).
 *
 * 새 preset 추가 방법:
 * 1. 이 Record에 항목 추가 (DTO 유효성 검사는 자동 반영됨)
 * 2. DB 인덱스가 정렬 기준과 일치하는지 확인
 */
export const KEYSET_PRESETS: Record<string, KeysetPreset> = {
  'created-at': {
    name: 'created-at',
    fields: [
      { field: 'createdAt', direction: 'desc', type: 'date' },
      { field: 'id', direction: 'asc', type: 'string' },
    ],
  },
  'view-count': {
    name: 'view-count',
    fields: [
      { field: 'viewCount', direction: 'desc', type: 'number' },
      { field: 'id', direction: 'asc', type: 'string' },
    ],
  },
};

/**
 * 등록된 preset 이름 목록. KeysetRequestDto 유효성 검사에 자동 반영됨.
 */
export const KEYSET_PRESET_NAMES = Object.keys(KEYSET_PRESETS);

export function getKeysetPreset(name: string): KeysetPreset {
  const preset = KEYSET_PRESETS[name];
  if (!preset) {
    const available = Object.keys(KEYSET_PRESETS).join(', ');
    throw new Error(
      `Unknown keyset preset: "${name}". Available: ${available}`,
    );
  }
  return preset;
}
