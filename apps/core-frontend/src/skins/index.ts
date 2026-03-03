export type SkinId = 'default' | 'dark';

export interface SkinMeta {
  id: SkinId;
  label: string;
}

export const SKINS: SkinMeta[] = [
  { id: 'default', label: '라이트' },
  { id: 'dark', label: '다크' },
];

export const DEFAULT_SKIN: SkinId = 'default';
