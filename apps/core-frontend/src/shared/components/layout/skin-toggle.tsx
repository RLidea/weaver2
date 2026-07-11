'use client';

import { MoonIcon, SunIcon, useSkin } from '@weaver2/ui';

export function SkinToggle() {
  const { skin, setSkin } = useSkin();

  function toggle() {
    setSkin(skin === 'default' ? 'dark' : 'default');
  }

  return (
    <button
      onClick={toggle}
      aria-label={skin === 'default' ? '다크 모드로 전환' : '라이트 모드로 전환'}
      className="rounded-md p-2 text-text-muted hover:bg-surface-2 transition-colors"
    >
      {skin === 'default' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
    </button>
  );
}
