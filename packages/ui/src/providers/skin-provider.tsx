'use client';

import { createContext, useContext, useState } from 'react';
import { DEFAULT_SKIN, type SkinId } from '../skins/index';

interface SkinContextValue {
  skin: SkinId;
  setSkin: (id: SkinId) => void;
}

const SkinContext = createContext<SkinContextValue>({
  skin: DEFAULT_SKIN,
  setSkin: () => {},
});

export function SkinProvider({ children }: { children: React.ReactNode }) {
  // 인라인 스크립트가 이미 data-skin을 세팅했으므로 DOM에서 초기값을 읽음
  const [skin, setSkinState] = useState<SkinId>(() => {
    if (typeof window === 'undefined') return DEFAULT_SKIN;
    return (document.documentElement.getAttribute('data-skin') as SkinId) ?? DEFAULT_SKIN;
  });

  function setSkin(id: SkinId) {
    setSkinState(id);
    localStorage.setItem('skin', id);
    document.documentElement.setAttribute('data-skin', id);
  }

  return (
    <SkinContext.Provider value={{ skin, setSkin }}>
      {children}
    </SkinContext.Provider>
  );
}

export function useSkin() {
  return useContext(SkinContext);
}
