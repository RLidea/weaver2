export type SkinId = 'default';

export interface SkinMeta {
  id: SkinId;
  label: string;
}

export const SKINS: SkinMeta[] = [
  { id: 'default', label: '기본' },
];

export const DEFAULT_SKIN: SkinId = 'default';
